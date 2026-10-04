# UPDATE_INSTRUCTIONS.md — 每日刷新 Moi 投资组合

> **给 AI 的话**：这份文件是完整的操作规程。如果 Moi 把这个 repo 的链接发给你并说「帮我更新组合」，请**完整读完本文件**再动手。所有的红线、口径、公式都在这里。
>
> **Owner**: Moi · **时区**: Malaysia (MYT, UTC+8) · **显示货币**: MYR
> **当前组合数据文件**: `portfolio-data.json`（当前持仓/行情唯一真源） · **历史期间数据**: `performance-2026.json`（独立期间收益真源） · **展示文件**: `index.html`

---

## 0. 最高优先级规则（违反会造成实际金钱损失）

1. **绝不编造价格。** 拿不到就说拿不到，沿用旧值并明确标注 `⚠ 未更新`。一个假价格会让 LSR 算错，Moi 可能因此错过 margin call 预警。
2. **不下单、不动钱。** 这份工作只读取、计算、更新展示。任何情况下都不要建议或执行买卖。
3. **严禁触碰**（除非 §3 的行权接货例外，或 Moi 明确指示）：
   - `constants.marginLoanMyr` = 362763.77
   - `constants.targetLsr` / `marginCallLsr` / `forceSellLsr`
   - `cash.myr` = 0（Owner 2026-09-30 指定 Idle Cash 只算 Moomoo money market fund + wallet；不得再加回 Maybank 现金/货币基金）
   - `wheelRealized`
   - `stockRealizedUsd` / `stockRealizedEstimated` / `stockRealizedDetail`（须重新对账历史成交与费用，不得随每日行情刷新重置）
   - `mplusRealizedUsd` / `mplusRealizedDetail`（仅凭新上传的 M+ 结单重新对账；不得逐次累加同一结单或用 OpenD 替代）
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

`cash.myr` = **0 固定**。Owner 于 2026-09-30 指定 Idle Cash 只计算 Moomoo USD 货币基金 + wallet；Maybank MYR 现金/货币基金不再计入组合总值。不要自行加回。

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
soldCallLiabUsd = Σ over kind=="covered" of (closePx × 100 × contracts)
soldOptionLiabMyr = (soldPutLiabUsd + soldCallLiabUsd) × fx

grossAssets = usMvMyr + myMv + goldMv + cryptoMv + cashTotal
netWorth    = grossAssets − margin − soldOptionLiabMyr

grossInvested = usCostMyr + myCost + goldCost + cryptoCost
totalDeployed = grossInvested + cashTotal − margin
unrealizedPL  = (usMvMyr + myMv + goldMv + cryptoMv) − grossInvested
realizedMyr   = (wheelRealized + stockRealizedUsd + mplusRealizedUsd) × fx
openOptionPL  = Σ(options[].expPL) × fx
totalROI      = unrealizedPL + openOptionPL + realizedMyr
totalROIPct   = totalROI / totalDeployed × 100
```

Hero 的 **Total ROI / 成本口径** 显示 `totalROI` 金额和 `totalROIPct`：当前持仓相对购入成本的未实现 P&L（含期权）+ 本年股票买卖净收益 + Wheel/MMF 已实现收入。分母为当前 deployed capital。这**不是严格 YTD 回报**，不得与 Moomoo Trend Analysis YTD 硬对平；已有持仓可能含跨年浮盈，范围还包括 M+、马股、黄金、HATA。`stockRealizedEstimated=true` 时股票、已实现合计与 Total ROI 金额须显示 `≈`。

### 5.1 股票已实现收益（Owner 2026-10-03 要求新增）

- 读取完整本年 `history_deal_list_query`，包括期权行权产生的股票 BUY/SELL；缺少期初成本时追溯前一年成交。每段查询不超过 360 天。
- 期权 premium 留在 `wheelRealized`，股票按买卖价与股票成本核算，不能用扣 premium 的 diluted cost 再计算一次收益。
- 用 `order_fee_query` 核对股票买入、卖出费用；买入费用按卖出比例分摊，卖出费用全扣。暂不另加股票股息。
- `positions.realized_pl` 是持仓生命周期口径、可含股息，且已清仓股票不会出现在 positions 中；不能直接累加当 YTD 股票买卖收益。
- 2026-10-03 对账：AMZN +$3,454.64、GOOGL −$67.90 已核对；NVDA 卖出 200 股净收益约 +$7,644.35。NVDA 早期 0.4 股成本缺失，当前 average_cost 舍入后反推的成本为估算，待历史结单确认。`stockRealizedUsd` 约 **$11,031.09**，`stockRealizedEstimated=true`。
- **BOXX 不能重复算**：Sheet「Wheel 2026」MMF 的 M67 公式已含 BOXX 卖出收益。OpenD BOXX 净收益 $45.7030 只列核对明细、不加入 `stockRealizedUsd`。保留已核准 Wheel/MMF $16,189.10（Sheet 使用舍入卖价，BOXX 较 OpenD 差 $0.7575，暂不调整）。
- 已实现合计约 **$27,220.19**。新增已实现数字只影响收益与 ROI 展示；不得额外加回 cash、grossAssets 或 netWorth，买卖所得已在现金/再投资持仓中。
- 原始成交、订单 ID、账户 ID 留在本地工作文件，不上传公开 GitHub；公开只保留汇总与方法。
- **Owner 页面偏好（2026-10-03）**：不要在看板加入独立的「2026 已实现股票买卖」明细表及其长篇对账说明。保留顶部股票收益、已实现合计与 ROI 汇总及估算标记；详细方法仅留在数据与对账文档，不要在后续刷新时重新添加该区块。
- 利润对账时间使用 `meta.profitReconciledAt`，与价格刷新 `meta.lastRefresh` 分开。此次价格、现金、期权持仓快照沿用 10/01，不得假称 10/03 全部刷新。
- Moi 提供的 Moomoo YTD cumulative P/L **$35,906.50**（含未实现）仅作参考，存为 owner-reported、`verifiedByOpenD=false`、`status=not_reconciled`；不得写成已实现或用差额填补未知成本。

开仓 short call 的 premium 已进入 wallet；净值须扣除它当前的平仓负债，以免高估资产。期权浮盈亏直接用 OpenD `unrealized_pl`，显示于期权区；未平仓 premium 不自动加入 `wheelRealized`。Covered call 由标的股票覆盖，不按 sold-put strike 锁定现金。

### 5.2 M+ 本年卖出收益（Owner 2026-10-04 指定，剔除 2026 前涨跌）

- `stockRealizedUsd` 保留原 Moomoo 股票数，**不包含 M+**；M+ 单独保存在 `mplusRealizedUsd`。页面股票收益汇总 = 两者之和；已实现合计再加 `wheelRealized`，不可重复累计。
- 本次来源：2025-12 + 2026-01 至 2026-09 十份 M+ 月结单。只覆盖截至 **2026-09-30**，不得假称已核对 10 月交易。
- 2025 年底已持有、2026 年出售的股数，以 **2025-12-31 Holding Summary 的 Close Price × 已卖股数** 为期初基准，不用历史购入成本。2026 归属卖出收益 = 已扣费卖出净额 − 期初基准市值。这是 owner 指定的期间归属口径，不是券商生命周期/税务已实现。
- 必须保留期间亏损，不能只累计上涨股票；也不得把仍持有股票的浮盈加入已实现。本年新买股票按本年买入成本和实际费用匹配，未卖部分留待以后出售。
- LLY 7 股：年初 $1,079.75/股，03/11 卖出 $995/股，净入 $6,950.79（费用 $14.21）；2026 归属 **−$607.46**。
- NVDA 26 股：年初 $187.54/股，06/15 卖出 $209.15/股，净入 $5,426.77（费用 $11.13）；2026 归属 **+$550.73**。
- `mplusRealizedUsd` = **−$56.73**（1–9 月；股票卖出净收益，不含股息/现金利息）。META 买 10 股、MSFT 买 14 股而未卖，不计实现收益。已核对每月持仓数量与全部四笔成交一致。
- 本次**不重算原 Moomoo 的历史成本口径**；Moomoo + M+ 的合计仍是混合口径，不能冒充统一、严格的 YTD 累计 P/L。
- 已实现合计沿用 Moomoo 股票约 $11,031.09 + Wheel/MMF $16,189.10 − M+ $56.73 = **约 $27,163.46**（Moomoo NVDA 仍有估算）。只更新收益/ROI，净值、闲置现金、持仓成本数量与行情不重复增加。
- 不上传原始 PDF、姓名住址、账户号、合同号；公开 GitHub 只保存收益汇总、计算方法、来源文件名与页码。页面不得重新加入已移除的独立股票明细表。

### 5.3 2026 区间盈亏（Owner 2026-10-04 要求新增）

- 页面新增日期范围/月份选择器，仅 2026 年。**当前只支持美股子组合（Moomoo、M+ 或两者）**，不得称全组合；不含期权/Wheel、BOXX/MMF、股息/利息、马股、黄金、BTC、Moomoo 零碎赠股（NVDA 除外）。这些资产的历史估值/账本尚不完整。缺历史不等于零收益。
- 本次为 owner 授权的新功能，可新增独立 HTML/CSS；原持仓、报价、净值/现金、Wheel/股票已实现及顶部 ROI、MY allocation net-equity 公式均不变。后续每日价格刷新不得重建或重置历史期间数据。
- 历史真源 `performance-2026.json` 与 HTML 内嵌 `INITIAL_PERFORMANCE` 必须同步；独立于当前 `portfolio-data.json`。在线载 JSON，离线用明确标注日期的内嵌快照。不用当前股数或浮盈倒推历史。
- **公式**：区间已实现 = 期末累计已实现 − 开始日期前一天累计已实现；区间未实现变化 = 期末浮盈亏 − 开始日期前一天浮盈亏；区间合计 = 两者之和。不得把区间已实现加期末浮盈当区间收益。卖出只是把浮盈转为已实现，必须抵消之前的浮盈，避免重复算或包含选定区间前的收益。
- 两家券商统一以 **2025-12-31 美股收盘价** 重置期初成本；所有 2026 前涨跌排除。2026 新买采用实际价格 + 已核对费用；卖出分摊移动平均成本并扣卖出费。已实现表示「本年归属的卖出收益」，不是生命周期/税务已实现。美元计价，不冒充包含历史 FX 的 MYR 回报。
- 日期按**美股交易所日历/美国东部时间**，不是 MYT。OpenD 成交保留接口列示日期，M+ 保留结单 trade date。休市日沿用前一有效收盘，非交易日入账的行权成交仍改变持仓；禁止把美国交易时间当香港/MYT 时间再倒移一天。
- 数据来源：OpenD `request_history_kline` 的 `K_DAY`、`AuType.NONE`（不复权收盘），本年历史成交和订单费用；M+ 2025-12 与 2026-01 至 09 结单提供股数、成交、实际费用，行情统一来自 OpenD。
- M+ 结单估值截点不同：12 月结单 Close Price 全部对应 **2025-12-30 美股收盘**，不是 12/31；09 月结单对应 09/29。已逐月验证 10 份结单。此模块不得混用结单 mark 与美股同日收盘；上方已核准的 M+ −$56.73 保留其原结单基准，不随新模块重置。解释放在模块的折叠说明与 `PERFORMANCE_2026.md`，不得恢复 owner 拒绝的独立已实现股票明细表。
- 核对截至：Moomoo **2026-10-02**，M+ **2026-09-30**；两家合计最多至 09/30。选到未覆盖日期、非 2026 年、倒序或缺边界估值，显示「未计算」并清空旧结果，**不能按零、插值或沿用一个看似有效的金额**。
- 本次核验：Moomoo 期初 NVDA 210.4、MSFT 5、AMZN 100 股，2026 13 笔主美股成交，重建后的股数与最新 positions 一致；M+ 4 笔交易，逐月股数全部与结单一致。主股票不含 BOXX，以免与 Wheel/MMF 重复。
- 严格年初基准的股票已实现：Moomoo **$2,485.12**；M+ **$5.80**。两家截至 09/30 的未实现变化 **$27,010.752**，合计 **$29,501.672**（显示 $29,501.67）。上方收益汇总包含不同成本口径及 Wheel，不得用差额硬对平 Moomoo app 的累计 P/L。
- 更新历史时先读取 K 线 quota、检查缺交易日/异常变动和公司行动；核对初始数量、全部成交及费用分摊，月末累计与按月相加必须一致。最新结单未到则不延长 M+ 覆盖；不能因为报价更新而假定无新交易。
- 公开只存每日累计已实现、浮盈亏、报价日期与方法；不上传原始结单、地址、账户号、订单号、成交号。测试：`node tests/performance.test.cjs`。

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
| 2026-09-30 | Owner 指定 Idle Cash 只算 Moomoo money market fund + wallet；`cash.myr` 设为 0，不再计入 Maybank 现金/货币基金 |
| 2026-10-01 | OpenD 确认 PLTR 11/06 $225 short call 1 张，由 139 股覆盖；净值须包含 short-call 平仓负债 |
| 2026-10-03 | 按 Owner 要求加入股票买卖净收益约 $11,031.09（NVDA 为成本反推估算）；确认 BOXX 已在 Wheel/MMF，避免重复累计。已实现合计约 $27,220.19；Total ROI 标明成本口径、非严格 YTD。 |

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
