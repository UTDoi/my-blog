
# gitのプロトコル
https://git-scm.com/book/ja/v2/Git%E3%82%B5%E3%83%BC%E3%83%90%E3%83%BC-%E3%83%97%E3%83%AD%E3%83%88%E3%82%B3%E3%83%AB

## https
https+httpベーシック認証を使えるので、匿名でのreadと暗号化(tls)+認証(basic認証)つきでのwriteを実現できるのが利点

## SSH
sshを使うので匿名でのアクセスだけはできないが、(ユーザー名を伝えないとsshできないので)もちろん暗号化と認証は実現できる

## git
暗号化も認証もないが高速なので、読み取り専用として使うべきプロトコル
remote repository側でgitプロトコルでのpushは許可しないようにしたいところ
