# moiportfolio

Moi 的投资组合看板 + 完整更新规程。设计成**任何 AI 拿到这个 repo 链接就能接手更新**。

🔗 **看板**：[index.html](./index.html)（下载后用浏览器打开，或开 GitHub Pages）
📊 **数据**：[portfolio-data.json](./portfolio-data.json) ← 唯一真源
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

显示货币统一为 **MYR**。净资产已扣除 Public Bank margin loan 及 sold-put liability。

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
