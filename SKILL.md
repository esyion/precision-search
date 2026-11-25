---
name: precision-search
description: 精确搜索方法论：给搜索词加结构锚点（如 `fn\(`、`"key":`、`<Comp`、`@user`、`^ERROR`）替代裸词 grep，一次命中、大幅降噪。任何搜索、查找、定位任务都适用——代码、文档、日志、配置、数据文件不限；只要第一步是搜索，就先读本 skill。Use for ANY search: grep, rg, find usages, callers, logs, docs.
---

# 精确搜索：语法锚点法

搜索慢、结果噪音多，根源几乎从不是工具性能，而是**搜索词太宽**。搜裸词 `startProcess`，命中里混着：定义、调用、注释、文档、字符串日志、同前缀变量……搜裸词 `超时`，分不清是标题、正文还是表格里的提及。你真正要的那几条被淹没了，翻噪音消耗的 token 和轮次，远多于在 pattern 里多写两个锚点字符。

核心动作只有一个，对任何内容（代码、文档、日志、配置、数据）都一样：**搜索前先问"目标以什么结构形式出现"，把这个形式直接写成 pattern。**

## 铁律一：正则模式下，锚点符号必须转义

Grep 工具与 `rg` 默认按正则解析 pattern。`(` `.` `[` `{` `?` 等有特殊含义：

- 找调用：`startProcess\(`，不是 `startProcess(` —— 未转义的 `(` 是非法正则，直接报错，白费一轮
- 找属性访问：`\.maxRetries`，不是 `.maxRetries` —— 裸 `.` 匹配任意字符

直觉：**你加的锚点符号，几乎都要在前面加 `\`**。唯一例外见下文终端固定字符串模式（`-F`）。

## 铁律二：从最窄 pattern 开始，逐级放宽

先构造"目标必然满足"的最窄形式；搜不到再放宽，并想清楚放宽的是什么。放宽顺序：换更贴目标的锚点 → 加词边界 `\b` → 最后才是裸词。

## 通用锚点（任何文本都适用）

| 你想找什么 | pattern | 说明 |
|---|---|---|
| 精确短语/字面量 | `"connection refused"` | 引号锁住完整字面，排除零散词汇命中 |
| 键的定义处（JSON/YAML/配置） | `"maxRetries":` / `maxRetries: ` | 冒号是键值分隔锚点 |
| 键的使用/读取处 | `\.maxRetries\b` / `get\("maxRetries"\)` | 带前导符号的是"使用"，带后置冒号的是"定义" |
| 某个值出现的位置 | `= 8080` / `: 8080\b` | 搜值不如搜"值所在的语句结构" |
| 逗号分隔结构中的位置 | `, 'production'\)` / `^abc,` | CSV 列、参数列表、枚举位置的定位利器 |
| 日志级别/行首标记 | `^ERROR` / `^\d{4}-\d{2}` | 行首锚点直接过滤日志噪音 |
| 提及/引用某人 | `@zhangsan\b` | 聊天记录、评论、邮件、code review |
| Markdown 标题 | `^## 部署` | 区分"标题里的提及"与"正文的提及" |
| 注释里的提及 | `// 目标词` / `\* 目标词` / `# 目标词` | 按语言选注释符号 |

## 代码场景锚点（最常用的应用）

| 你想找什么 | pattern | 说明 |
|---|---|---|
| 函数/方法的调用处 | `startProcess\(` | 调用必有左括号；定义通常也有，需再区分（见下节） |
| 仅方法调用（对象上的） | `\.startProcess\(` | 排除顶层函数定义与本地裸调用 |
| 异步调用点 | `await startProcess\(` | 比全部调用更窄 |
| 实例化 | `new DatabaseConnection\(` | JS/TS/Java/C#/PHP 通用 |
| 类定义 | `class DatabaseConnection\b` | |
| 组件被渲染（JSX/TSX） | `<UserCard` | import、定义、字符串都不算"被渲染" |
| 接口的实现类 / 子类 | `implements UserRepo\b` / `extends BaseHandler\b` | |
| 模块被谁引入 | `from ['"]task-engine['"]` / `require\(['"]task-engine['"]\)` | 按项目语言选 |
| 注解/装饰器 | `@GetMapping\(` | |
| switch 分支 | `case 'order_refund'` | |

## 区分"定义"与"调用"

要"仅调用"，先搜 `fnName\(` 拿全量，再从结果里剔除定义位置。各语言定义锚点：

| 语言 | 定义 pattern |
|---|---|
| JS/TS | `function startProcess\(`、`const startProcess = `；类方法与调用形态相同，靠返回类型/修饰符或逐条判断 |
| Python | `def start_process\(` |
| Java/C# | `(public|private|protected|static|synchronized|final|override).*\bstartProcess\(`；或直接搜 `startProcess\(` 配合文件 glob，定义通常只有一处 |
| Go | `func startProcess\(`；方法 `func \(\w+ \*?\w+\) startProcess\(` |
| Rust | `fn start_process\(` |

**ripgrep 默认引擎不支持 look-around**：`(?<!def )foo`、`foo(?!bar)` 会直接报错。不要尝试；用"全量搜索 + 剔除定义"或"定义锚点反向定位"代替。

## 前缀陷阱

标识符互为前缀是常见噪音源：`maxRetries` vs `maxRetriesLimit`、`startProcess` vs `startProcessCount`。

- 排除右侧延伸：`\bmaxRetries\b`
- `\b` 本身不用转义、永远安全；拿不准就带上

## 终端命令场景（rg / grep）

```powershell
# -F 固定字符串模式：pattern 就是纯文本，锚点符号不用转义
rg -F 'startProcess(' src/

# 限定语言类型，大幅提速
rg -t ts 'startProcess\('

# 只列文件名；需要上下文用 -C 3
rg -l 'new DatabaseConnection\('
```

`-F` 下 `(` 不用转义；非 `-F` 模式仍按本 skill 转义。PowerShell 里 pattern 一律用单引号包起来；grep 同样支持 `-F`。

## 与搜索工具参数配合

锚点解决"行内精度"，范围参数解决"文件精度"，组合使用：

- glob 限定文件：`*.ts`、`**/*.java`、`*.log`
- type 限定语言：`ts`、`py`、`rust`
- 测试文件噪音大时，用 glob 排除或单独统计

## 搜索决策流

1. **说意图**：定义？调用？使用？还是任意提及？目标在什么结构里（键值对、调用、标题、日志行、表格列）？
2. **查表选锚点**，写出最窄 pattern；逐个检查锚点符号是否已转义
3. **结果太多** → 加一级锚点（`\.`、`await`、`new`、实参逗号、`^` 行首、`\b`），或加 glob/type 收窄范围
4. **结果为空** → 依次检查：转义写对了吗？命名/写法风格是否不同（camelCase/snake_case、大小写、简繁体，用词根如 `start.*[Pp]rocess` 探路）？不确定时加 `-i`？最后才放宽锚点
5. 永远不要用 look-around

## 何时可以用裸词

- 目标词全库足够独特（长驼峰名、`__INTERNAL_RPC_HANDLER__` 这类常量、罕见中文词组）——裸词本身就是精确 pattern
- 搜自然语言正文：没有结构锚点可加时直接搜词组；噪音大时用上文结构锚点（标题、引号、行首）收窄

## 反例对照（最重要的直觉）

| 场景 | ❌ 别这样 | ✅ 这样 |
|---|---|---|
| 找调用 | `startProcess` | `startProcess\(` |
| 找渲染 | `UserCard` | `<UserCard` |
| 找实例化 | `DatabaseConnection` | `new DatabaseConnection\(` |
| 找配置读取 | `maxRetries` | `\.maxRetries\b` |
| 找键定义 | `maxRetries` | `"maxRetries":` |
| 搜错误日志 | `connection refused` | `"connection refused"` 或 `^ERROR.*refused` |
| 特定实参调用 | `production` | `, 'production'\)` |
| 找实现类 | `UserRepo` | `implements UserRepo\b` |
