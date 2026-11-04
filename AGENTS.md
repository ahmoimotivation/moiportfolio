# Moi portfolio 工作规则

开始修改前完整阅读 UPDATE_INSTRUCTIONS.md。用户后续明确指示优先于旧快照或旧技能中的固定值。

- 当前持仓/聚合快照：portfolio-data.json；HTML 内联 holdings 必须镜像。历史收益另在 performance-2026.json，不随行情刷新改写。
- 现金范围（owner 2026-11-04确认）：纳入 Moomoo USD 钱包、基金及 MYR 钱包；`cash.myr` 每次取该 OpenD 账户 `my_cash`，不再固定为0。Maybank现金/货币基金仍排除。基金与在途分别核对，赎回转入钱包后不能重复保留旧在途或另算收益。优先直接用USD货币查询读取fund_assets，避免混币折算。
- 每次用户要求刷新组合或 margin：重新读取 owner 的 Google Sheet「Margin Calculator」→「moi journal」最新有效流水，涵盖新增存款、取款、Maybank 买入、转入、股息、利息和实际贷款。不要把旧行号、旧本金、旧股数或旧平均成本固定下来。源链接从用户私有上下文或连接的 Drive 查找，不写入公开仓库。
- Maybank 价格每次用 Google Chrome 核对报价及日期。最新行情与 Sheet 的参考价不同则按 Chrome 价重算。
- Maybank 净损益＝股价损益＋已记Maybank股息−净融资利息；本金回报率＝净损益÷（外部现金存入−取出＋Maybank转入本金参考）。不含REIT本金/股息；借款及股息再投资不是新增本金。当前未另扣交易/账户费用。
- 新买入后验证数量与移动平均成本；报表均价过期、汇总未覆盖新增行、缺成交价或出现卖出等情况，先核对再计算，不能沿用旧H6/I6冒充更新。
- 股息已抵贷款，不能再加到资产或现金。Total ROI 只额外加Maybank股息减净利息，不再加一次整个Maybank净损益。
- 公开只放聚合数据；不上传私人 Sheet URL/ID、账户号、交易编号、原始流水或截图。
- 核验：node margin.test.cjs；node tests/performance.test.cjs。发布后验证 live 页面；不要只确认提交成功。
- 不下单、不动钱、不把估算LSR写成银行正式通知。保留成本/转入本金/未入账利息等实际局限。

