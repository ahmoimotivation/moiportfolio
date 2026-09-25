# UPDATE_INSTRUCTIONS.md — 每日刷新 Moi 投资组合

> **给 AI 的话**：这份文件是完整的操作规程。如果 Moi 把这个 repo 的链接发给你并说「帮我更新组合」，请**完整读完本文件**再动手。所有的红线、口径、公式都在这里。
>
> **Owner**: Moi · **时区**: Malaysia (MYT, UTC+8) · **显示货币**: MYR
> **数据文件**: `portfolio-data.json`（唯一真源） · **展示文件**: `index.html`

---

## 0. 最高优先级规则（违反会造成实际金钱损失）

1. **绝不编造价格。** 拿不到就说拿不到，沿用旧值并明确标注 `⚠ 未更新`。一个假价格会让 LSR 算错，Moi 可能因此错过 margin call 预警。
2. **不下单、不动钱。** 这份工作只读取、计算、更新展示。任何情况下都不要建议或执行买卖。
3. **严禁触碰**（除非 §3 的行权接货例外，或 Moi 明确指示）：
   - `constants.marginLoanMyr` = 362763.77
   - `constants.targetLsr` / `marginCallLsr` / `forceSellLsr`
   - `cash.myr` = 38003.47（Moomoo 拉不到，Moi 手动维护）
   - `wheelRealized`
   - 任何持仓的 `qty` 和 `cost`
   - `index.html` 的 CSS / HTML 结构
   - **Allocation 饼图的 MY stocks 口径**：`value = Math.max(0, myMv - margin)`（net equity，非 gross）。这是 Moi 在 2026-07-07 明确指定的，不要改回 gross。
4. **你只更新「价格类」字段**：`px`、`spotUsd`、`pxUsd`、`fx`、`cash.usd`、`options[]`、`ulPxFallback`、`meta.*`、`derived.*`。

---

## 1. 数据源与优先级

| 数据 | 首选来源 | 备注 |
|---|---|---|
| 美股价格 | Moomoo OpenD `quote_snapshot` | 若无 Moomoo，用任意可靠财经源（Yahoo/Google Finance），标注来源 |
| 美股/期权持仓、现金 | Moomoo OpenD `positions` + `account_info` | **只有 Moi 的本地 OpenD 能拿到**。外部 AI 请让 Moi 贴数据 |
| MAYBANK 1155 | **Google Chrome Search** | 必须读取 Google 财经卡片的现价与时间；MAYBANK 决定 LSR，不得用 OpenD 代替 |
| IGBREIT 5227 / SUNREIT 5176 | Google Chrome Search；失败才沿用旧值并标注 | Moomoo 的 MY 行情权限常失效 |
| BTC | **Google Chrome Search** | 读取 Google Finance 的 BTC/USD 即时报价与时间；不得用 OpenD 代替 |
| 黄金 spot USD/oz | **Google Chrome Search** | 从 Google 结果里的可靠 live spot 来源（优先 Kitco）读取；要 spot，不是 GLD/IAU ETF |
| USD/MYR | **WebSearch**（Moomoo 报 "Unsupported quote market"） | |
| USD/HKD | **WebSearch** | 只用于把 Moomoo `fund_assets`（HKD 计价）折算成 USD |

> **Owner standing instruction（2026-09-25）**：MAYBANK、黄金 spot、BTC 三项价格每次都必须通过 **Google Chrome Search** 更新，即使 OpenD 正常也一样。把来源与报价时间写入 `meta.priceAsOf` 和页面 footnote。

### 如果你是 ChatGPT / 没有 Moomoo 的 AI
你**拿不到**持仓、现金、期权（那些只存在于 Moi 本地的 OpenD gateway）。你能做的是：
1. 用 `portfolio-data.json` 里现有的 `qty` / `cost` 作为持仓（这些很少变）。
2. 自己查最新价格：美股、马股、BTC、黄金 spot、USD/MYR。
3. 按 §5 重算，按 §6 出简报。
4. 明确告诉 Moi：**现金余额和期权持仓你没法验证**，用的是 JSON 里的上次快照值。

---

## 2. Moomoo 操作要点（有 OpenD 时）

### 2.1 先确认 gateway
调 `moomoo_get_global_state`，要求 `ok:true` 且 `trd_logined` 与 `qot_logined` 都为 `true`。

**失败 = OpenD 没开。** 这时候：
- 保留上次所有 OpenD 来源的值（期权/美股/现金）**原封不动**
- 简报顶部标：`⚠⚠ OpenD 没开 — 大部分数据没更新，请打开 OpenD gateway 后让我手动再刷一次`
- 仍用 Google Chrome Search 刷 MAYBANK、黄金与 BTC；用 WebSearch 刷 FX，然后发简报

### 2.2 ⚠ acc_id 的坑（踩过）
真实账户 `acc_id` 是 **18 位数字**，超过 JavaScript 安全整数上限（2^53）。
**直接当 number 传会被四舍五入**（末位 `...731` 变成 `...740`），返回 `Nonexisting acc_id`。

👉 **一律用字符串传**：`{"trd_env":"REAL","acc_id":"<18位数字>"}`

找账户：`moomoo_list_accounts(params:{})` → 取 `trd_env=REAL` 且 `security_firm=FUTUMY` 的那个。

### 2.3 批量报价的坑
`quote_snapshot` 的 `code_list` 里只要有**一个非法 symbol，整批失败**。有疑问就分开拉。
结果很大容易被截断 —— 只需要每只的 `last_price`。
马股 quote 的 `update_time` 是 MYT 当地时间。

---

## 3. 期权处理

### 3.1 Moomoo option code 解析
格式：`US.PLTR260702P141000` = 标的 + YYMMDD + P/C + strike×1000

映射到 `options[]`：

| 字段 | 取值 |
|---|---|
| `ul` | 标的（PLTR） |
| `side` | `P` → `"put"` · `C` → `"call"` |
| `kind` | call → `"covered"` · put → `"csp"` |
| `strike` | strike ÷ 1000 |
| `expiry` | `"2026-MM-DD"` |
| `contracts` | `abs(qty)` |
| `premium` | `round(cost_price × 100 × contracts)` |
| `closePx` | `nominal_price` |
| `expPL` | `unrealized_pl`（直接用，不要自己算） |
| `opn` | `null` |
| `ulPx` | 该标的当前股价（来自 quote_snapshot） |

**整组替换** `options[]`，不要增量合并。

### 3.2 行权接货侦测（重要 —— 2026-07-02 PLTR $141 put 已发生过一次）
若某期权**从持仓消失**，且对应股票 `qty` 增加（或 `us_cash` 出现 strike×100 级别的减少）
→ 说明 sold put 被行权接货。

处理：按 Moomoo positions 的实际值**重建**该股票行的 `qty` 与 `cost`（用 `cost_price` / `diluted_cost`），
`note` 注明「X/X $XXX put 行权接货」，并在简报里**点名**。

> 这是「严禁触碰 qty/cost」规则的**唯一例外**。

---

## 4. 现金口径（2026-07-03 起）

```
cash.usd = account_info.us_cash
         + USD 货币基金
```

USD 货币基金的取法，按顺序试：
1. 若 positions 里有 `US.BOXX`（现金停泊 ETF）→ 用它的 `market_val`
2. 否则用 `account_info.fund_assets`（**HKD 计价**）÷ USD/HKD 汇率

> ⚠ 不要再用 2026-07-03 之前的旧口径「+97321.89」。
> 2026-08-01 起 BOXX 已换成 SOXX，货币基金改走 `fund_assets`。

`cash.myr` = **38003.47 固定**（Maybank 货币基金 + 现金，Moomoo 拉不到）。不要动。

---

## 5. 计算公式

设 `fx = fx.usdMyr`，`margin = constants.marginLoanMyr`。

```
usMvUsd   = Σ(us[].qty × us[].px)
usMvMyr   = usMvUsd × fx
usCostMyr = Σ(us[].qty × us[].cost) × fx

myMv      = Σ(my[].qty × my[].px)          // MYR 原币
myCost    = Σ(my[].qty × my[].cost)

goldMv    = gold.oz × gold.spotUsd × fx × constants.uobBuybackMultiplier
goldCost  = gold.oz × gold.costPerOz

cryptoMv  = crypto.qty × crypto.pxUsd × fx
cryptoCost= crypto.costMyr

cashTotal = cash.usd × fx + cash.myr

soldPutLiabUsd = Σ over kind=="csp" of (closePx × 100 × contracts)
soldPutLiabMyr = soldPutLiabUsd × fx

grossAssets = usMvMyr + myMv + goldMv + cryptoMv + cashTotal
netWorth    = grossAssets − margin − soldPutLiabMyr

grossInvested = usCostMyr + myCost + goldCost + cryptoCost
totalDeployed = grossInvested + cashTotal − margin
unrealizedPL  = (usMvMyr + myMv + goldMv + cryptoMv) − grossInvested
realizedMyr   = wheelRealized × fx
totalROI      = unrealizedPL + realizedMyr
totalROIPct   = totalROI / totalDeployed × 100
```

Hero 的 **Total ROI 26'** 必须显示 `totalROI` 金额和 `totalROIPct`，口径固定为「未实现 P&L + Wheel 已实现收入」。

### LSR（margin health，Public Bank）
```
sharesVal    = myMv                          // 只算马股，不含美股
LSR          = margin / sharesVal × 100
bufferToCall = 70 − LSR                      // 单位 pp

pumpCall  = margin × (1 − 69/70)             // margin call 时补多少能拉回 69%
pumpForce = margin × (1 − 69/80)
```

**门槛**：margin call ≥ 70% · force-sell ≥ 80% · 目标 69%

因为 margin loan 只押马股，LSR 实际上几乎完全由 **MAYBANK (1155)** 决定 —— 它占马股市值约 90%。所以 MAYBANK 的价格**每次必抓**。

### 触发价反推（简报里很有用）
```
触发 margin call 的 MAYBANK 价格 = (margin/0.70 − 其他马股 MV) / MAYBANK qty
```

---

## 6. 输出：中文早晨简报（≤180 字正文）

必含：
1. **Net Worth** + 较上次 delta（金额 + %）
2. **LSR XX.XX%**（距 margin call 70% 还有 XX pp）
   - ≥65% → 报警
   - ≥70% → 双红旗 ⚠⚠
3. 🇲🇾 马股三只：MAYBANK · IGBREIT · SUNREIT
4. **Top movers** 3 个
5. **期权专项**：
   - open 期权净浮盈亏
   - 任何 sold put **ITM 必须点名**（提示 buy-back / 是否 roll）
   - 距 strike <5% 的 OTM 也提一句
6. **⚠ 警示**触发条件：
   - OpenD 没开
   - 美股跌 >5% 或马股跌 >3%
   - option ITM 翻转
   - LSR 越线
   - 侦测到行权接货

---

## 7. Sanity check（出简报前必做）

| 情况 | 处理 |
|---|---|
| 新价 vs 上次偏差 **>30%** | 当误判，**沿用旧值**，简报标注 |
| 偏差 **5–30%** | 用新价，但标注「大幅变动」 |
| 期权 `expPL` | 直接用 `unrealized_pl`，不要自己算 |
| 市场休市 | 明确写出「休市，沿用 X 月 X 日收盘」，不要假装是当日价 |

**常见休市**（会让价格「没变」，这是正常的，不是 bug）：
- 美股：Labor Day（9 月第一个周一）、Thanksgiving、Christmas 等
- 马股：Bursa 开盘 09:00 MYT。早上 9 点前刷新，拿到的必然是上一交易日收盘

---

## 8. 更新流程 checklist

1. [ ] 确认数据源可用（OpenD / Google Chrome Search / WebSearch）
2. [ ] 拉价格：美股（OpenD）· MAYBANK/黄金/BTC（Google Chrome Search）· IGBREIT/SUNREIT（Chrome）· USD/MYR (· USD/HKD)
3. [ ] 拉持仓 + 现金（有 Moomoo 时），侦测行权接货
4. [ ] Sanity check（§7）
5. [ ] 更新 `portfolio-data.json` 的价格类字段 + `meta.*`
6. [ ] 把**同样的数字**镜像进 `index.html` 里的 `const holdings={...}` 块
7. [ ] 更新 `index.html` 顶部 header 那行日期说明 + 底部 footnote
8. [ ] 按 §5 重算 `derived.*`
9. [ ] 出简报（§6）

---

## 9. 已知历史事件（避免重复误判）

| 日期 | 事件 |
|---|---|
| 2026-06-18 | GOOGL $387.5 put 行权接货 100 股 |
| 2026-07-02 | PLTR $141 put 行权接货 100 股 |
| 2026-07-03 | 现金口径改版；M+ 加仓 QQQ 46 / UNH 31 |
| 2026-07-07 | Allocation 饼图 MY stocks 改为 net equity 口径 |
| 2026-08-01 | BOXX 全部换成 SOXX 18 股；META Moomoo 加仓 17 股 |
| 2026-08 初 | NVDA $195 put、AMZN $230 put 双双买回平仓（**非**接货）。此后 sold-put liability = $0 |
| 2026-09-07 | Moomoo 马股行情权限失效（`No permission to get quotes for MY.1155`）|
| 2026-09-25 | Owner 指定 MAYBANK、黄金 spot、BTC 每次必须由 Google Chrome Search 更新，不再以 OpenD 报价作为这三项的来源 |
| 2026-09-25 | 复核 Google Sheet「Wheel 2026」：期权净收益 $15,038.56 + MMF $1,150.5355 = `wheelRealized` $16,189.0955（显示 $16,189.10） |

> ✅ **已解决**：当前 `wheelRealized` 沿用 owner 的 Google Sheet「Wheel 2026」TOTAL 定义，包含已扣亏损、roll/buy-back 与表内费用后的期权净收益，以及 MMF 收益。OpenD 成交对账得到期权净收益 $15,085.55，较 Sheet 高 $46.99（手填成交价/费用差异）；dashboard 采用 Sheet 总数 $16,189.10。

---

## 10. 名词对照

| 缩写 | 含义 |
|---|---|
| **LSR** | Loan-to-Share Ratio，margin 贷款 ÷ 马股市值 |
| **M+** | Malacca Securities，Moi 的第二个券商（Moomoo 拉不到其持仓） |
| **CSP** | Cash-Secured Put（sold put） |
| **Wheel** | 卖 put 接货 → 卖 covered call 的轮动策略 |
| **UOB buyback** | 实物金回购价，估算 = spot × 1.01 |
| **OpenD** | Moomoo 的本地行情/交易 gateway，必须在 Moi 电脑上运行 |
