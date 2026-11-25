# precision-search

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

一个 [Claude Code](https://code.claude.com) skill：用**语法锚点 pattern** 替代裸词 grep——一次命中，而不是一堆噪音。

English documentation: [README.md](README.md).

## 问题

让 agent 找 `startProcess` 的调用处，它会去搜裸词 `startProcess`，结果被噪音淹没：

```
src/index.ts:1        import { startProcess } from './task-engine';   ← import
src/task-engine.ts:16 export async function startProcess(             ← 定义
src/task-engine.ts:26       await startProcess(child.template, ...);  ← ✓ 这才是调用
src/routes.ts:2       import { startProcess } from './task-engine';   ← import
README.md:8           Calling `startProcess` kicks off a run          ← 文档提及
src/config/retry.ts:22 * ...maxRetries may never exceed maxRetriesLimit ← 前缀陷阱（另一个查询）
```

工具不慢，**是搜索词太宽**。agent 为翻噪音多花好几轮工具调用和 token；代码库一大就开始靠猜。

## 方法

一个动作，适用于一切搜索——代码、文档、日志、配置、数据文件、聊天记录导出，不限：

> 搜索前先问：**"目标以什么结构形式出现？"**——把这个形式直接写进 pattern。

调用必有左括号：`startProcess\(`。JSX 渲染必有开标签：`<UserCard`。实例化必有 `new`：`new DatabaseConnection\(`。配置读取带前导点：`\.maxRetries\b`。键定义带后置冒号：`"maxRetries":`。错误日志行首是级别：`^ERROR.*refused`。

### 速查表

| 你想找什么 | ❌ 裸词 | ✅ 锚点 |
|---|---|---|
| 函数调用处 | `startProcess` | `startProcess\(` |
| 仅方法调用 | `startProcess` | `\.startProcess\(` |
| JSX 渲染处 | `UserCard` | `<UserCard` |
| 实例化 | `DatabaseConnection` | `new DatabaseConnection\(` |
| 配置键读取 | `maxRetries` | `\.maxRetries\b` |
| 配置键定义 | `maxRetries` | `"maxRetries":` |
| 错误日志 | `connection refused` | `^ERROR.*refused` |
| 特定实参调用 | `production` | `, 'production'\)` |
| 接口实现类 | `UserRepo` | `implements UserRepo\b` |

完整参考——通用锚点、各语言定义 pattern、前缀陷阱、搜索决策流、以及什么时候裸词其实没问题——见 [SKILL.md](SKILL.md)。

## 安装

把 skill 拷进 Claude Code 的 skills 目录：

```bash
git clone https://github.com/esyion/precision-search.git
mkdir -p ~/.claude/skills/precision-search
cp precision-search/SKILL.md ~/.claude/skills/precision-search/SKILL.md
```

Windows 上把 `~/.claude/...` 换成 `%USERPROFILE%\.claude\skills\precision-search\`。

装完即生效，无需配置：只要任务的第一步是搜索——grep、`rg`、找用法、找调用方、日志排查、配置定位——Claude 会先读这个 skill 再搜。也可以用 `/precision-search` 手动触发。

支持任何实现了 [Agent Skills](https://agentskills.io) 规范的编码 agent，不限于 Claude Code。

## 两条铁律

1. **锚点符号必须转义。** 正则模式下 `(` `.` `[` `{` `?` 是元字符。`startProcess(` 是*非法正则*，直接报错白费一轮；`startProcess\(` 才是你要的搜索。（唯一例外：`rg -F` / `grep -F` 固定字符串模式，什么都不用转义。）
2. **从最窄开始，逐级放宽。** 先构造目标*必然*满足的最窄 pattern；放宽要有意识：换更贴的锚点 → 加 `\b` → 最后才是裸词。

另有一条硬约束：**ripgrep 默认引擎不支持 look-around**——`(?<!def )foo`、`foo(?!bar)` 会直接报错。别试；从锚点结果集里剔除定义即可。

## 评测

三个合成仓库（TypeScript 代码库、日志目录、运维配置仓库）上的六个搜索任务，每个都埋了陷阱：形似调用的定义行、注释提及、前缀陷阱、同短语不同级别的日志行、以及值互相冲突的配置键与环境变量覆盖。

每次运行按 5 项断言评分——召回、定义甄别、噪音规避、锚点使用、不使用 look-around。`with_skill` = 装了本 skill 的 agent；`baseline` = 同一 agent、同一批提示词、无 skill。

| 轮次 | with_skill | baseline | baseline 失败项 |
|---|---|---|---|
| 1 | **30/30 (100%)** | 25.5/30 (85%) | 混合 |
| 2 | **30/30 (100%)** | 26/30 (86.7%) | 4 项全在 A4：用了裸词搜索 |

### 这些数字说明什么、不说明什么

诚实的解读：在*小规模* fixtures 上，baseline 多数时候也能找对位置——靠裸词搜索后逐条人工甄别。它失分集中在*方法*断言（A4）：搜得宽，然后用额外读取买单。本 skill 的价值是把锚点方法变成**每次搜索的默认动作**，而这才是可扩展的部分：20 个文件可以人工核对，两万个不行。

值得一提：两个非代码任务（日志排查、配置审计）with_skill 满分，且出现了真实的分析增益——例如用字符类锚点（`[Ss]ession[_-]?[Tt]ime[_-]?[Oo]ut`）发现 `app.yaml` 与 `production.env` 之间 `1800` vs `3600` 的 session 超时配置冲突。

### 复现

fixtures、任务提示词、陷阱设计与评分器都在 [evals/](evals/)：

```bash
python evals/grade.py runs/your-iteration
```

目录布局与断言定义见 [evals/README.md](evals/README.md)。

## 许可

[MIT](LICENSE) © 2026 esyion
