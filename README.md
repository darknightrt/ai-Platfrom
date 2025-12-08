**ai Platfrom** 是一个开箱即用的、跨平台的存储提示词与工作流平台。它基于 **Next.js 14** + **Tailwind&nbsp;CSS** + **TypeScript** 构建，支持提示词与工作流同步、收藏同步、本地/云端存储，让你可以随时随地查看工作流与提示词内容。

## 🗺 目录
 - [✨ 功能特性](#-功能特性)
  - [🗺 目录](#-目录)
  - [技术栈](#技术栈)
  - [部署](#部署)
  -  - [普通部署（localstorage）](#普通部署localstorage)
     - - [Cloudflare 部署](#cloudflare-部署)
      - [普通部署（localstorage）](#普通部署localstorage-2)
      - [D1 支持](#d1-支持)
      - [Vercel 部署](#vercel-部署)
      - [普通部署（localstorage）](#普通部署localstorage)
        
## 技术栈

## 部署

本项目**支持 Vercel、Cloudflare** 部署。
存储支持矩阵
|               | Docker | Vercel | Netlify | Cloudflare |
| localstorage  |        |    ✅  |         |     ✅     |
| Cloudflare D1 |        |        |         |     ✅     |
✅：经测试支持

### Vercel 部署

#### 普通部署（localstorage）

1. **Fork** 本仓库到你的 GitHub 账户。
2. 登陆 [Vercel](https://vercel.com/)，点击 **Add New → Project**，选择 Fork 后的仓库。
3. 设置 PASSWORD 环境变量。
4. 保持默认设置完成首次部署。
5. 如需自定义 `config.json`，请直接修改 Fork 后仓库中该文件。
6. 每次 Push 到 `main` 分支将自动触发重新构建。

部署完成后即可通过分配的域名访问，也可以绑定自定义域名。

### Cloudflare 部署

**Cloudflare Pages 的环境变量尽量设置为密钥而非文本**

#### 普通部署（localstorage）

1. **Fork** 本仓库到你的 GitHub 账户。
2. 登陆 [Cloudflare](https://cloudflare.com)，点击 **计算（Workers）-> Workers 和 Pages**，点击创建
3. 选择 Pages，导入现有的 Git 存储库，选择 Fork 后的仓库
4. 构建命令填写 **pnpm run pages:build**，预设框架为无，**构建输出目录**为 `.vercel/output/static`
5. 保持默认设置完成首次部署。进入设置，将兼容性标志设置为 `nodejs_compat`，无需选择，直接粘贴
6. 首次部署完成后进入设置重试部署。
7. 如需自定义 `config.json`，请直接修改 Fork 后仓库中该文件。
8. 每次 Push 到 `main` 分支将自动触发重新构建。

#### D1 支持

0. 完成普通部署并成功访问
1. 点击 **存储和数据库 -> D1 SQL 数据库**，创建一个新的数据库，名称随意
2. 进入刚创建的数据库，点击左上角的 Explore Data，将[d1-init](d1-init.sql) 中的内容粘贴到 Query 窗口后点击 **Run All**，等待运行完成
3. 返回你的 pages 项目，进入 **设置 -> 绑定**，添加绑定 D1 数据库，选择你刚创建的数据库，变量名称填 **DB**
4. 设置环境变量 NEXT_PUBLIC_STORAGE_TYPE，值为 **d1**；设置 USERNAME 和 PASSWORD 作为站长账号
5. 重试部署
# 存储模式（可选）
# localstorage - 浏览器本地存储（默认）
# d1 - Cloudflare D1 数据库
NEXT_PUBLIC_STORAGE_TYPE=localstorage
```



