# Forty-Nine 架构说明（PlantUML）

本文用 PlantUML 描述整体结构、状态与关键交互。可在 IDE 中安装 PlantUML 插件预览，或使用 [PlantUML 在线服务](https://www.plantuml.com/plantuml/uml) 粘贴各段 `@startuml` … `@enduml` 渲染。

---

## 1. 系统边界（无后端、单机页内）

不同访客、不同设备之间无共享会话；持久化仅为浏览器 `localStorage`（同域同浏览器配置下多标签页会共用存储键，见代码注释）。

```plantuml
@startuml forty-nine-context
!theme plain
skinparam shadowing false
left to right direction

actor "使用者" as U
rectangle "浏览器" {
  rectangle "Forty-Nine\n(Vite + React SPA)" as SPA
  database "localStorage\n(divination_state,\ndivination_anim_speed)" as LS
}

U --> SPA : 交互（分堆、确认等）
SPA <--> LS : 进度恢复 / 节奏偏好
note right of SPA
  无自建后端、无 WebSocket、
  无多用户「房间」
end note
@enduml
```

---

## 2. 源码分层与依赖（概览）

```plantuml
@startuml forty-nine-layers
!theme plain
skinparam componentStyle rectangle
skinparam shadowing false

package "入口" {
  [main.tsx] as main
}

package "页面组装" {
  [App.tsx] as app
}

package "components" {
  [StalkBundle]
  [SplitArea]
  [YaoDisplay]
  [Prompt]
  [ConfirmDialog]
  [ContemplationDialog]
  [HexagramGallery]
  [HexagramDetail]
  [HomeIntro]
}

package "hooks" {
  [useDivinationMachine] as hook
}

package "engine" {
  [divination.ts] as div
  [hexagrams.ts] as hex
}

package "types" {
  [types.ts] as types
}

main --> app
app --> hook
app --> div
app --> components

hook --> types
hook --> div
div --> hex
div --> types

components ..> types : 部分通过 props\n间接使用结构
@enduml
```

---

## 3. 应用内三屏流程

```plantuml
@startuml forty-nine-screens
!theme plain
skinparam shadowing false
[*] --> HOME : 启动
HOME --> GALLERY : 进入六十四卦
GALLERY --> DIVINATION : 画廊结束 / 进入揲蓍

state DIVINATION {
  state "useDivinationMachine\n状态机" as SM
}

note bottom of DIVINATION
  成卦后 reset 只回到占卜状态机 PREPARE，\n不会自动把 screen 切回 HOME\n（返回首页若有入口需单独实现）
end note
@enduml
```

---

## 4. 占卜主状态机（`MachineState`）

类型中另有 `CHANGE_COMPLETE`，当前实现未作为独立 `machineState` 使用；实际转移由 `ANIMATING` 内 `advanceAnimation` 在「三变结束」时直接写入下一 `AWAITING_SPLIT` 或 `HEXAGRAM_COMPLETE`。

```plantuml
@startuml forty-nine-machine-state
!theme plain
skinparam shadowing false
hide empty description

state "«bootstrap»\nRECOVERING" as REC #LightYellow
state ANIMATING #LightBlue

[*] --> PREPARE : 无存档或\n卦成/准备态已清档

PREPARE --> CONFIRMING : removeTaiChi
CONFIRMING --> CONTEMPLATING : confirmStart
CONFIRMING --> PREPARE : discardAndRestart\n(取消)

CONTEMPLATING --> AWAITING_SPLIT : startContemplation

RECOVERING --> AWAITING_SPLIT : resumeFromStorage
RECOVERING --> PREPARE : discardAndRestart

AWAITING_SPLIT --> ANIMATING : split(ratio)\n→ 一变演算 + 动画

ANIMATING --> AWAITING_SPLIT : 未满 6 爻\n(下一变或下一爻)
ANIMATING --> HEXAGRAM_COMPLETE : 第 6 爻完成

HEXAGRAM_COMPLETE --> PREPARE : reset()

note right of REC
  初次 hydrate：localStorage\n存在进行中存档时
end note
@enduml
```

---

## 5. 揲蓍动画子阶段（`animationPhase`，仅在 `ANIMATING`）

```plantuml
@startuml forty-nine-animation-phases
!theme plain
skinparam shadowing false

[*] --> SPLIT
SPLIT --> HANG_ONE
HANG_ONE --> COUNT_LEFT
COUNT_LEFT --> COUNT_RIGHT
COUNT_RIGHT --> GATHER
GATHER --> REGROUP
REGROUP --> PAUSE
PAUSE --> [*] : 本变结束\n→ advanceAnimation\n更新 total / 爻等

note bottom
  各阶段停留时间由\nBASE_PHASE_TIMING × 节奏档\n(tickDelayMs) 驱动 setTimeout 链
end note
@enduml
```

---

## 6. `DIVINATION` 屏主要组件与数据（简化）

```plantuml
@startuml forty-nine-divination-components
!theme plain
skinparam shadowing false
left to right direction

rectangle "App (DIVINATION)" {
  [Prompt]
  [StalkBundle]
  [SplitArea]
  [YaoDisplay]
  [HexagramDetail?]
}

package "useDivinationMachine" as hook {
  rectangle "state:\nDivinationState" as st
}

[HexagramDetail?] ..> hook : 成卦后\ngetHexagramInfo(details)
SplitArea --> hook : onSplit → split
[StalkBundle] <-- hook : total, phase,\nchangeResult…
Prompt <-- hook : 由 machineState\n推导文案
@enduml
```

---

## 7. 时序：用户完成一次「分而为二」到进入动画

```plantuml
@startuml forty-nine-seq-split
!theme plain
skinparam shadowing false
autonumber

actor "用户" as U
participant "SplitArea" as SA
participant "App" as A
participant "useDivinationMachine" as M
participant "performChange\n(divination.ts)" as E

U -> SA : pointer 交互\n得到 ratio
SA -> A : onSplit(ratio)
A -> M : split(ratio)
M -> E : performChange(total, ratio)
E --> M : ChangeResult
M -> M : setState\nANIMATING / SPLIT\n+ currentChangeResult
A -> M : useEffect 见 ANIMATING+SPLIT\nrunAnimation()
loop 定时 tick
  M -> M : advanceAnimation()\n推进 animationPhase\n或进入下一变/爻
end
@enduml
```

---

## 8. 可选：六十四卦数据与查表

```plantuml
@startuml forty-nine-engine-data
!theme plain
skinparam shadowing false

[divination.ts] --> [hexagrams.ts] : HEXAGRAM_TABLE\n卦辞、卦名、经卦象…
[divination.ts] ..> [hexagrams.ts] : getHexagramInfo /\n文本与详情组装

note right of [hexagrams.ts]
  静态数据与查表逻辑，\n无运行时网络请求
end note
@enduml
```

---

## 图的选择说明

| 图 | 用途 |
|----|------|
| 1 系统边界 | 说明「纯前端 + localStorage」，避免误解有多用户后端 |
| 2 分层依赖 | 新人快速定位 `App` / `hooks` / `engine` / 组件职责 |
| 3 三屏 | `HOME` / `GALLERY` / `DIVINATION` 与路由式切换关系 |
| 4 主状态机 | 产品流程与恢复、取消、成卦的核心契约 |
| 5 动画子阶段 | 与 `types.AnimationPhase` 及 `advanceAnimation` 对齐 |
| 6 组件与状态 | DIVINATION 主界面谁读谁写状态 |
| 7 时序 | 一次 `split` 到 `runAnimation` 闭环 |
| 8 引擎数据 | 卦象数据从哪里来 |

若后续增加后端或账号体系，应增补 **部署图** 与 **鉴权 / 会话** 时序图；当前仓库不必画 C4 容器级多服务图。
