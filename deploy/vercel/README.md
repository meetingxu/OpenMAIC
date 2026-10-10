# 启知课堂：Vercel与Cloudflare免费访问实验

2026-10-10决定：保留Vercel，不购买腾讯云，不删除 `openmaic-preview`。
目标域名 `qizhi.ailantan.com`；当前 `ailantan.com` 权威DNS为DNSPod。
本文件是研究结论与待执行方案；未改变DNS、Vercel或Cloudflare账号配置，未部署本地试用改造。

## 推荐顺序

1. 先在Vercel将产品分支部署成受访问码保护的版本，环境变量配置 `TRIAL_MODE=true`、随机 `ACCESS_CODE`、`DEFAULT_MODEL`及服务端模型凭据。凭据由运营者本地填写，不入Git。沿用浏览器本地课程保存、禁用Pro与共享账户API的试用策略。
2. 给Vercel项目关联自有域名，在DNSPod按Vercel实际返回的记录配置；不要猜测通用IP或CNAME目标。直接访问作为测速基线，自有域名不代表一定提速。
3. 若愿意试Cloudflare免费代理，先盘点并导出完整DNS记录，包括主站、邮件MX、验证TXT、CAA等；免费常规CDN接入需要将整个主域名权威DNS转到Cloudflare。不能直接假定只改 `qizhi` CNAME即可；保持DNSPod的官方CNAME partial接入仅Business/Enterprise支持。
4. 对同一产品部署设置直连测试域名和Cloudflare代理测试域名，保留回滚路径。只给已验证项目域名开启代理；TLS用Full (strict)。授权、`/api/*`、HTML/RSC、带Cookie的响应不启用整站缓存；仅对确定公开且带内容哈希的静态资源遵循源站缓存头。不要启用Cache Everything。
5. 从大陆电信、联通、移动、无VPN的网络比较：DNS/TLS/首字节、页面可交互、首个模型输出、完整课程、失败率；在白天与晚间分别测试。单次本机测速不代表三网质量。
6. 验证无码API401、有效码访问、运营者API403、不同访客课程不串、Cookie正确、服务器Key不进入响应和浏览器存储。验证SSE持续输出、首字节与心跳，没有中途524/504。代理不能延长Vercel函数执行上限。
7. 只有实测改善才保留代理；否则切回直连。Cloudflare免费不是大陆专线，没有稳定提速保证。

## 平台约束

- Cloudflare中国网络需要Enterprise另购订阅，免费网络不包含该大陆节点服务。
- Vercel不推荐额外代理，可能增加延迟、影响缓存及Bot检测；官方同时支持Cloudflare Verified Proxy Lite自动接入（CF-Connecting-IP），不是完全禁止代理。
- CF代理默认Proxy Read Timeout目前为125秒；耗时接口及时输出流并实测，不能将Vercel的300秒误当CF一定能等300秒。
- Vercel Fluid Compute开启时Hobby函数最多300秒；代码中的更短maxDuration仍需要单独审查。仓库当前vercel.json为300秒，但部分路由明确30/60/120秒。
- Vercel Hobby仅个人非商业用途。给潜在客户试用/推广产品可能属于商业用途，不能因为访客免费就假定允许；正式商用前核实适用计划。
- 模型调用仍可能收费，云托管免费与模型账单分开，运营者应在模型平台设置预算。

## 为何暂不整体迁到Workers

Cloudflare官方支持通过OpenNext部署Next.js，但当前项目有Node依赖、本地文件读写、后台任务和原生sharp等路径，需要适配与实际验证。
Workers的虚拟文件系统按请求临时存在，不能当持久课程存储。免费Workers当前每日100000请求、128MB内存、每HTTP请求10ms CPU；等待网络不算CPU，但SSR/JSON处理可能超限。
轻量转发与整个Next应用迁移是两个不同工作量的方案；先测试CDN路径再决定迁移。

## 官方依据

- https://vercel.com/kb/guide/cloudflare-with-vercel
- https://vercel.com/docs/security/reverse-proxy
- https://developers.cloudflare.com/china-network/
- https://developers.cloudflare.com/dns/zone-setups/partial-setup/
- https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/
- https://vercel.com/docs/functions/limitations
- https://vercel.com/docs/plans/hobby
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/platform/limits/
- https://developers.cloudflare.com/changelog/post/2025-08-15-nodejs-fs/
