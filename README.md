# moiportfolio

Moi 的投资组合看板 + 完整更新规程。设计成**任何 AI 拿到这个 repo 链接就能接手更新**。

🔗 **看板**：[index.html](./index.html)（下载后用浏览器打开，或开 GitHub Pages）
📊 **当前组合数据**：[portfolio-data.json](./portfolio-data.json) ← 当前持仓/行情唯一真源
📅 **2026 区间盈亏**：[performance-2026.json](./performance-2026.json) · [口径与覆盖](./PERFORMANCE_2026.md)
📖 **更新规程**：[UPDATE_INSTRUCTIONS.md](./UPDATE_INSTRUCTIONS.md) ← **AI 请先读这个**

---

## 组合构成

| 类别 | 内容 | 券商 / 托管 |
|---|---|---|
| 美股 | GOOGL · META · MSFT · NVDA · SOXX · NOW · PLTR · QQQ · UNH | Moomoo (FUTUMY) + M+ (Malacca Securities) |
| 马股 | MAYBANK (1155) · IGBREIT (5227) · SUNREIT (5176) | Public Bank（MAYBANK 部分 margin 融资）|
| 实物黄金 | Kangaroo 1oz × 7（Perth Mint 99.99%）| UOB |
| 加密货币 | BTC | HATA |
| 现金 | USD（含货币基金）+ MYR | Moomoo / Maybank |
| 期权 | Wheel 策略（sold put → covered call）| Moomoo |

当前资产看板货币为 **MYR**。净资产已扣除 Public Bank margin loan 及所有 sold-option liability。

## 2026 区间盈亏

看板新增按月、年初至已核对日和自选日期，分别显示区间已实现、未实现**变化**、合计盈亏及月度图。

- 当前仅 **Moomoo / M+ 美股子组合**，金额 USD，日期按美股交易日；不是全组合收益。
- Moomoo 覆盖至 2026-10-02，M+ 至 2026-09-30；合计只到共同覆盖日，不推算缺资料日期。
- 以 2025-12-31 美股收盘重置成本，排除 2026 前涨跌；卖出已实现加**浮盈变化**，不重复计算。
- 不含期权/Wheel、基金、股息利息、马股、黄金、BTC 及少量赠股。原顶部收益/ROI 不变，与此处期间口径不同。
- 下载 `index.html` 可离线使用内嵌历史快照；在线历史真源是 `performance-2026.json`。测试：`node tests/performance.test.cjs`。

---

## 给 AI 的快速上手

复制这段话发给 ChatGPT / Gemini / 任何 AI：

```
请读 https://github.com/ahmoimotivation/moiportfolio

1. 先完整读 UPDATE_INSTRUCTIONS.md —— 里面有所有红线和公式，特别是
   §0（严禁触碰的字段）和 §5（计算公式）。
2. 读 portfolio-data.json 拿到我的持仓。
3. 帮我查最新价格：美股用 Moomoo；MAYBANK、黄金 spot、BTC 必须用 Google Chrome Search；IGBREIT/SUNREIT 也优先用 Chrome；USD/MYR 用 WebSearch。
4. 按 §5 重算净资产和 LSR。
5. 按 §6 给我中文早晨简报。
6. 把更新后的完整 portfolio-data.json 给我，我自己贴回去。

注意：你拿不到我的 Moomoo 现金余额和期权持仓（那是我本地 gateway），
直接用 JSON 里的快照值，并告诉我这部分没验证过。
```

如果 AI 无法直接读 GitHub 页面，改用 raw 链接：

```
https://raw.githubusercontent.com/ahmoimotivation/moiportfolio/main/UPDATE_INSTRUCTIONS.md
https://raw.githubusercontent.com/ahmoimotivation/moiportfolio/main/portfolio-data.json
```

---

## 最需要盯的一个数字：LSR

**LSR = Public Bank margin 贷款 ÷ 马股市值**

- ≥ **70%** → margin call
- ≥ **80%** → force sell
- 目标 **69%**

因为贷款只押马股，而 MAYBANK 占马股市值约 90%，**LSR 基本等于 MAYBANK 的股价**。
所以每次刷新 MAYBANK (1155) 必须抓到，抓不到就等于盲飞。

---

## 更新频率

工作日早晨（MYT）。完整 checklist 见 [UPDATE_INSTRUCTIONS.md §8](./UPDATE_INSTRUCTIONS.md#8-更新流程-checklist)。

---

## ⚠️ 关于这个 repo 是公开的

这个 repo 目前是 **Public**，任何人都能看到里面的持仓、净资产和 margin 状况。
这是 owner 的主动选择（为了让外部 AI 能通过链接读取）。

如果哪天想收回：Settings → General → 最底部 Danger Zone → Change visibility → Private。
注意改成 private 后，ChatGPT 等外部 AI 就读不到了。

**不要**在这个 repo 里放：API key、券商密码、access token、
或任何「知道就能访问」的标识符（例如开了"知道链接即可查看"的 Google Sheet ID）。
