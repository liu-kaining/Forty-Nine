# Forty-Nine 架构说明

本文提供 **PlantUML** 与 **Mermaid** 两套等价图示。

- **PlantUML**：可在 IDE 安装插件预览，或粘贴到 [PlantUML 在线服务](https://www.plantuml.com/plantuml/uml)（`@startuml` … `@enduml`）。
- **Mermaid**：GitHub、GitLab、多数文档站与 VS Code 预览原生支持 ```mermaid 代码块；亦可使用 [Mermaid Live Editor](https://mermaid.live)。

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

## Mermaid 版本（与上文 §1～8 对应）

### M1. 系统边界

```mermaid
flowchart LR
  U([使用者])
  subgraph Browser[浏览器]
    SPA["Forty-Nine（Vite + React SPA）"]
    LS[("localStorage：divination_state / anim_speed")]
  end
  U -->|交互：分堆、确认等| SPA
  SPA <-->|进度恢复、节奏偏好| LS
```

（无后端、无 WebSocket、无多用户房间——同 §1 文字说明。）

### M2. 源码分层与依赖

```mermaid
flowchart TB
  subgraph entry[入口]
    main[main.tsx]
  end
  subgraph page[页面组装]
    app[App.tsx]
  end
  subgraph comp[components]
    direction TB
    StalkBundle
    SplitArea
    YaoDisplay
    Prompt
    ConfirmDialog
    ContemplationDialog
    HexagramGallery
    HexagramDetail
    HomeIntro
  end
  subgraph hooks[hooks]
    hook[useDivinationMachine]
  end
  subgraph engine[engine]
    div[divination.ts]
    hex[hexagrams.ts]
  end
  subgraph types_pkg[types]
    types[types.ts]
  end
  main --> app
  app --> hook
  app --> div
  app --> comp
  hook --> types
  hook --> div
  div --> hex
  div --> types
  comp -.->|部分 props 结构| types
```

### M3. 应用内三屏流程

```mermaid
stateDiagram-v2
  [*] --> HOME : 启动
  HOME --> GALLERY : 进入六十四卦
  GALLERY --> DIVINATION : 画廊结束 / 进入揲蓍
  note right of DIVINATION
    屏内挂载 useDivinationMachine；
    成卦后 reset 只回到状态机 PREPARE，
    不会自动把 screen 切回 HOME
  end note
```

### M4. 占卜主状态机（`MachineState`）

```mermaid
stateDiagram-v2
  classDef recovering fill:#fff9c4,stroke:#333
  classDef animating fill:#e3f2fd,stroke:#333

  [*] --> PREPARE : 无存档或卦成/准备态已清档
  [*] --> RECOVERING : hydrate：localStorage 有进行中存档

  PREPARE --> CONFIRMING : removeTaiChi
  CONFIRMING --> CONTEMPLATING : confirmStart
  CONFIRMING --> PREPARE : discardAndRestart（取消）

  CONTEMPLATING --> AWAITING_SPLIT : startContemplation

  RECOVERING --> AWAITING_SPLIT : resumeFromStorage
  RECOVERING --> PREPARE : discardAndRestart

  AWAITING_SPLIT --> ANIMATING : split(ratio)

  ANIMATING --> AWAITING_SPLIT : 未满 6 爻（下一变或下一爻）
  ANIMATING --> HEXAGRAM_COMPLETE : 第 6 爻完成

  HEXAGRAM_COMPLETE --> PREPARE : reset()

  class RECOVERING recovering
  class ANIMATING animating
```

（`CHANGE_COMPLETE` 在类型中存在、当前未作为独立 `machineState` 使用——同 §4。）

### M5. 揲蓍动画子阶段（`animationPhase`）

```mermaid
flowchart LR
  SPLIT --> HANG_ONE --> COUNT_LEFT --> COUNT_RIGHT --> GATHER --> REGROUP --> PAUSE --> DONE([本变结束：advanceAnimation])
```

各阶段停留：`BASE_PHASE_TIMING × 节奏档`，由 `tickDelayMs` 与 `setTimeout` 链驱动。

### M6. `DIVINATION` 屏主要组件与状态

```mermaid
flowchart TB
  subgraph DIV["App（DIVINATION 主区）"]
    Prompt
    StalkBundle
    SplitArea
    YaoDisplay
    HD[HexagramDetail]
  end
  H[useDivinationMachine]

  SplitArea -->|onSplit → split| H
  H -->|total / phase / changeResult …| StalkBundle
  H -->|machineState → 文案| Prompt
  H --> YaoDisplay
  HD -.->|成卦后展示，数据由 App 从 state 派生| H
```

### M7. 时序：一次分堆到进入动画

```mermaid
sequenceDiagram
  autonumber
  actor U as 用户
  participant SA as SplitArea
  participant A as App
  participant M as useDivinationMachine
  participant E as performChange

  U->>SA: pointer 交互得到 ratio
  SA->>A: onSplit(ratio)
  A->>M: split(ratio)
  M->>E: performChange(total, ratio)
  E-->>M: ChangeResult
  M->>M: setState ANIMATING + SPLIT + currentChangeResult
  A->>M: useEffect：ANIMATING+SPLIT → runAnimation()
  loop 定时 tick
    M->>M: advanceAnimation()
  end
```

### M8. 六十四卦数据与查表

```mermaid
flowchart LR
  div[divination.ts] -->|HEXAGRAM_TABLE 等| hex[hexagrams.ts]
  div -.->|getHexagramInfo 组装详情| hex
```

（静态数据与查表，无运行时网络请求。）

---

## 图的选择说明

| 图 | PlantUML | Mermaid |
|----|----------|---------|
| 1 系统边界 | §1 | M1 |
| 2 分层依赖 | §2 | M2 |
| 3 三屏 | §3 | M3 |
| 4 主状态机 | §4 | M4 |
| 5 动画子阶段 | §5 | M5 |
| 6 组件与状态 | §6 | M6 |
| 7 时序 | §7 | M7 |
| 8 引擎数据 | §8 | M8 |

各图用途与上表一致：系统边界、分层、三屏、主状态机、动画子阶段、组件数据流、分堆时序、引擎数据。

若后续增加后端或账号体系，应增补 **部署图** 与 **鉴权 / 会话** 时序图；当前仓库不必画 C4 容器级多服务图。
