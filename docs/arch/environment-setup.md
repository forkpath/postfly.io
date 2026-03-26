## 环境配置

### Better-Auth配置

文件：`apps/web/vite.config.mts`

```ts
 ...
  server: {
    port: parseInt(process.env.WEB_PORT as string, 10) || 3000,
    host: 'localhost',
    allowedHosts: ['localhost', 'postfly.io'],
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '/api')
      }
    }
  }
  ...
```

- 在本地开发环境下，allowedHosts内容只需要是localhost即可
- 在通过cloudflared域名反向代理访问本地开发环境时，需要将代理域名填入allowedHosts中
