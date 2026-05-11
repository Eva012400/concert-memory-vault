# Concert Memory Vault

一个独立运行的静态网站原型，用来记录演唱会记忆。页面、样式和交互都在本仓库内，不需要后端或构建步骤。

## 本地运行

```bash
python3 -m http.server 5180
```

打开：

```text
http://127.0.0.1:5180
```

## GitHub Pages 部署

这个仓库已经包含 GitHub Pages Actions 工作流：

```text
.github/workflows/pages.yml
```

部署步骤：

1. 在 GitHub 新建一个仓库，例如 `concert-memory-vault`。
2. 把本地文件推到该仓库的 `main` 分支。
3. 进入仓库 `Settings -> Pages`。
4. 在 `Build and deployment` 里选择 `GitHub Actions`。
5. 等待 `Deploy static site to GitHub Pages` workflow 完成。

发布地址通常是：

```text
https://<你的 GitHub 用户名>.github.io/concert-memory-vault/
```

## 文件结构

```text
index.html
styles.css
app.js
.nojekyll
.github/workflows/pages.yml
```

## 数据说明

网站使用浏览器 `localStorage` 保存演唱会记录。部署到 GitHub Pages 后，每个访问者的数据都只保存在自己的浏览器里。
