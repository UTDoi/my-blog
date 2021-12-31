---
published: true
date: "2021-11-23"
title: "git のデータ転送プロトコルに関するメモ"
slug: "/blog/git-protocol"
---

git のデータ転送プロトコルに関するメモを軽くまとめてみた。
[参考資料](https://git-scm.com/book/ja/v2/Git%E3%82%B5%E3%83%BC%E3%83%90%E3%83%BC-%E3%83%97%E3%83%AD%E3%83%88%E3%82%B3%E3%83%AB)

## https

https+http ベーシック認証を使えるので、匿名での read と暗号化(tls)+認証(basic 認証)つきでの write を実現できるのが利点

## SSH

ssh を使うので匿名でのアクセスだけはできないが、(ユーザー名を伝えないと ssh できないので)もちろん暗号化と認証は実現できる

## git

暗号化も認証もないが高速なので、読み取り専用として使うべきプロトコル
remote repository 側で git プロトコルでの push は許可しないようにしたいところ
