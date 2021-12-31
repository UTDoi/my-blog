---
published: true
date: "2019-05-30"
title: "sshについて"
slug: "/blog/about-ssh"
---

## 仕組み

以下のような流れで ssh 接続を確立する。

1. client で key pair を生成
2. server で user を作成し、pub_key を渡して user を紐付け
3. client から ip と user を指定し、接続要求を行う
4. server で乱数を生成、user に紐づく pub_key を取り出し、乱数を暗号化したものを client に返す(この時乱数からハッシュ値も作って保存しておく)
5. client で、server から受け取った暗号を private_key で復号しつつ復号されたもの(=server で生成した乱数)からハッシュ値を生成、know_hosts に保存し server にも送る
6. client から送られてきたハッシュ値と server に保存したハッシュ値が同じなら認証成功->接続

## ssh agent forwarding

ssh agent で登録させた内容を接続後の ssh 接続に引き継ぐ。

`サーバ A->サーバ B->サーバ C`

って感じで ssh するとき、

1. サーバ A にある秘密鍵をサーバ A の ssh agent に登録
2. サーバ B に公開鍵認証で接続
3. そのままサーバー B から C に接続する時、秘密鍵を A の ssh agent から引継ぎ、公開鍵認証を行う

って手法。
これによりサーバ B に秘密鍵を保存しておかなくて済む。

ssh agent に秘密鍵を渡すには、

`ssh-add -K <keyへのpath>`

これで key chain store に鍵が登録されるので、今後自動的に agent に key が渡される。
なお sshconfig に`AddKeysToAgent yes`を入れてあげれば -K つけなくても OK。
あとは sshconfig に`ForwardAgent yes`を追加してあげれば OK。
