# 仕組み
1. clientでkey pairを生成
2. serverでuserを作成し、pub_keyを渡してuserを紐付け
3. clientからipとuserを指定し、接続要求を行う
4. serverで乱数を生成、userに紐づくpub_keyを取り出し、乱数を暗号化したものをclientに返す この時乱数からハッシュ値も作って保存しておく
5. clientで、serverから受け取った暗号をprivate_keyで復号する 複合されたもの(=serverで生成した乱数)からハッシュ値を生成、know_hostsに保存しserverにも送る
6. clientから送られてきたハッシュ値とserverに保存したハッシュ値が同じなら認証成功->接続

# ssh agent forwarding
ssh agentで登録させた内容を接続後のssh接続に引き継ぐ

サーバーA->サーバB->サーバC

って感じでsshするとき、

- サーバーAにある秘密鍵をサーバAのssh agentに登録
- サーバBに公開鍵認証で接続
- そのままサーバーBからCに接続する時、秘密鍵をAのssh agentから引継ぎ、公開鍵認証を行う

って手法

これによりサーバBに秘密鍵を保存しておかなくて済む

ssh agentに秘密鍵を渡すには、

`ssh-add -K <keyへのpath>`

これでkey chain storeに鍵が登録されるので、今後自動的にagentにkeyが渡される


※
sshconfigに
`
AddKeysToAgent yes
`
を入れてあげれば -KつけなくてもOK


あとはsshconfigに
`
ForwardAgent yes
`
を追加してあげればOK
