# 腾讯云授权码试用部署

## 选型与预算（2026-10-10核实）

起步推荐 Linux 轻量应用服务器 2核4GB、60GB SSD、5Mbps、500GB/月流量。
这是少量访客、外部模型 API、浏览器本地保存课程的估算起点，尚未做云端负载测试。
2核2GB可尝试运行预构建镜像，但不作为此次对外试用的推荐配置。
在本机 Linux Docker 或 CI 构建镜像，再上传/拉取到云端，避免低内存机器现场构建。
不需要GPU；此配置不启动 PostgreSQL、Pro工作台或 Chromium/FFmpeg 云端视频渲染。
上游渲染服务标准配置自身需要8GB，低内存配置自身需要4GB，不能与应用挤在4GB主机上。

当前免费页面的2核4GB轻量套餐提供1个月，但本账号领取时显示“加入会员”；免费资格尚未确认，未开通会员或提交订单。
企业4核8GB轻量套餐当天已领完。不要把会员价或新用户首购价当作长期续费价。
内地2核4GB套餐官方常规价65元/月，当前年度8.5折为663元/年。
试用页宣称试用期间续费一年3.5折，若按780元年原价计算是273元；这是条件计算，未取得本账号订单报价，不能保证领取或永久同价。
香港锐驰型2核4GB/60GB官方常规价95元/月，全年按月预算1140元；2核4GB不适用该文档的香港年度时长折扣。
香港入门型跨境质量不保证，故快速外部试用优先比较香港锐驰型。
模型调用、域名、备份及超额流量另计。服务器免费不代表模型调用免费。

价格：https://cloud.tencent.com/document/product/1207/73452/
试用：https://cloud.tencent.com/act/pro/free
备案：https://cloud.tencent.com/document/api/243/19630

有腾讯云接入备案的域名：选内地，完成接入后上线。
无备案且要马上公开试用：先选香港并核实控制台最终报价及网络。
内地即使用IP对外提供网站也不能作为规避备案的方法；免费一个月不满足页面所列备案资源时长要求。

## 试用版行为与边界

设置 `TRIAL_MODE=true`：

- 至少16字符随机访问码、服务端默认模型缺失时拒绝启动。
- 访客不填写API Key；浏览器只收到服务商状态和默认模型ID。
- 所有LLM阶段忽略访客的模型、路由、Key、base URL、provider type、thinking覆盖，使用服务器默认模型或运营者 `MODEL_ROUTES`。
- 未配置在服务器的付费提供商不可使用。多模态需运营者配置并单独验收；初版模板仅配置文本。
- 设置面板只保留通用设置，隐藏Key、Token Plan、模型服务及全站用量。
- 禁止共享用量、服务端账户存储、异步全课堂作业、Pro工作台等需要真实用户身份的API；课程保存在访客各自浏览器。
- HTTPS代理覆盖客户端转发IP头；应用3000端口不对公网开放。每IP每分钟60次API请求，最多4个并发API连接，全站8个。

这是小范围邀请演示：单个共享访问码不是独立账号，也不提供逐人撤销/计费；轮换码使旧会话失效。
课堂分享链接仍是显式分享功能，拿到分享链接和访问码的人能阅读分享课程。不要放入私人教学材料。
限速及连接上限不是人民币消费硬上限；必须在模型平台设置消费预算/告警，有硬上限时启用硬上限。
访客自带浏览器旧Key不会变成服务器Key，后端仍按服务端规则处理。建议验收使用干净浏览器。
网页中原来输入的MiniMax Key保存在本机浏览器，不能随仓库或镜像自动迁移到云端；由运营者在服务器本地输入，禁止发送到聊天。

## 部署步骤

1. 创建选定地域的Ubuntu 24.04 LTS服务器，安装官方Docker Engine/Compose。防火墙开放80/443，SSH仅允许运营者IP；3000/8080不开放。
2. 在Linux构建机/CI的产品分支上执行 `docker build -t <registry>/openmaic:<commit-sha> .`。构建环境不要放任何真实密钥。公共镜像只包含公开代码；私有镜像仓库也不能代替密钥管理。
3. 将 `deploy/tencent/` 的配置放到 `/opt/openmaic/deploy/`；把模板复制为 `/opt/openmaic/secrets/trial.env`，目录权限700、文件600，由运营者本地填写Key及随机访问码。该文件仅运行时注入，不进Git或镜像。
4. 在配置目录 `.env` 填写 `OPENMAIC_IMAGE=<不可变镜像标签>` 与 `TRIAL_DOMAIN=<域名>`，仅含非密钥配置。DNS指向服务器，内地先完成备案。
5. 运行 `docker compose -f compose.yml config --quiet`，然后 `docker compose -f compose.yml up -d`。不打印完整 `compose config`，避免展开真实密钥。
6. 验证容器健康、HTTPS、无访问码API返回401、有效码进入、新浏览器不要求模型配置、一次最小文本/课程生成，以及禁止的API返回403。用浏览器检查响应及存储均不含服务器Key；不要在日志中记录请求授权头。
7. 保留镜像SHA和数据卷备份；更新时先备份、换新镜像标签、验收；失败切回上一个镜像。备份独立保存，备份费用另计。

目前未创建云资源、配置域名、传输密钥或部署；此目录是待账号/地域确认后使用的部署材料。

本次本地验证：338项相关测试、TypeScript检查、ESLint（无错误）、完整生产构建通过。
使用假密钥启动生产standalone服务后，验证了首页/健康200、无码和错误码401、正确码后可读模型信息、Cookie带HttpOnly/Secure、响应不含服务器Key、运营者接口403。
没有调用真实模型API；Linux Docker栈、HTTPS签发、真实课程生成与云端负载尚待部署后验收。

## 保持fork同步

`origin` 是 `meetingxu/OpenMAIC`；`upstream` 是 `THU-MAIC/OpenMAIC`。
`main`只做上游镜像，自己的修改始终保留在 `codex/openmaic-product`。
不要直接把产品分支重置为上游，也不要在产品分支点“丢弃提交/同步fork”。

每次同步前先把产品修改提交并保证工作区干净，随后：

```sh
git fetch upstream
git switch main
git merge --ff-only upstream/main
git push origin main
git switch codex/openmaic-product
git merge main
# 有冲突先解决，保留试用安全策略和二次开发行为
pnpm install --frozen-lockfile
pnpm test -- tests/server/trial-policy.test.ts tests/server/middleware-access-token.test.ts tests/server/resolve-model.test.ts tests/server/provider-config.test.ts tests/store/settings-server-sync.test.ts
pnpm build
node scripts/check-public-secrets.mjs
git push origin codex/openmaic-product
```

用merge保留双方历史，避免对共享分支强制推送。上线只使用测试通过的产品分支提交，不自动部署upstream/main。
2026-10-10已fetch：当前上游多47个提交、产品独有1个提交；本次没有盲目合入这47个变更。
如果以后希望二次开发代码私有，可以另建独立私有仓库并手动保留upstream，保留MIT许可证和版权说明；这与把当前公开fork改私有是不同操作。

## 密钥与公开仓库

`.env*`、`server-providers*.yml`、`secrets/`、本地 `outputs/`、证书Key及数据/日志目录均排除。
Docker上下文同样排除秘密和本地输出。真实凭据禁止 `NEXT_PUBLIC_*`、Docker ARG、提交/PR正文或CI日志。
提交前运行秘密扫描脚本，并在GitHub开启可用的secret scanning/push protection。
本地扫描为启发式检查，不能证明所有Git历史绝无泄漏；如发现历史泄漏，先撤销/轮换密钥，再清理历史。

## Vercel清理

目标为团队 `xuyujian520-1246` 的 `openmaic-preview`。
当前连接器读取返回403，CLI无凭据；尚未删除。先在Vercel确认项目归属，再由用户在项目Settings里确认永久删除。
不要把删除本地 `.vercel/` 当成删除云端部署。删除项目后检查Git集成不会再创建部署。
