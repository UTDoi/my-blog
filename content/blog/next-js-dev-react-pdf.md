---
published: true
date: "2024-07-28"
title: "Next.js で react-pdf を使ってて Uncaught TypeError: Object.defineProperty called on non-object エラーが出たときの対処法。"
slug: "/blog/next-js-dev-react-pdf"
---

next.js では development 環境の場合 sourcemap の形式(webpack config の devtool の値)が ‘eval-source-map’ に固定される。

- https://nextjs.org/docs/messages/improper-devtool
- https://github.com/vercel/next.js/discussions/21425


しかしそれが react-pdf と相性が悪く(というか pdfjs と相性が悪く?) Uncaught TypeError: Object.defineProperty called on non-object エラーになってしまう。

- https://github.com/wojtekmaj/react-pdf/issues/1813

そのため next.config.js で以下のような HACK をしないと開発環境でうまく使えないのである。

```
    webpack: (config) => {
       if (dev) {
        Object.defineProperty(config, "devtool", {
          get() {
            return "source-map";
          },
          set() {},
        });
      }
      return config;
    },
```
