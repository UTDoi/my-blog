---
published: true
date: "2019-05-21"
title: "linuxについて"
slug: "/blog/about-linux"
---

## linux(kernel)の三大要素

- process
  - 実行されているプログラム
- file
  - 広義の意味でのファイル
- stream
  - process と file, もしくは process と process をつなぐ入出力パイプ
  - process は process や file 自体にではなく stream に r/w を行うことによって相手の詳細を考えずに一律に操作できる

それぞれの関係図は以下のようなイメージ
`process <- stream -> process <- stream -> file`

## file

ここでは file は広義のファイルを指す。
つまり regular file だけじゃなく、directory や symlink, special file(device など)も指す。

file はその file の所有 user, 所有 group, そして permission 属性をもつ。

デフォルトではその file を作成した user が所有 user,その user が属する group が 所有 group になる。

permission は 所有 user, 所有 group に属する user, その他の user に対する read/write/execute をそれぞれ指定する。

例えば fileA の permission が `rwxr-xr--(754)` で 所有 user が alice, 所有 group が redclass として、user: bob が group:redclass に属しているとすれば、

- alice は fileA に読み書き実行全部できる
- bob は fileA の読みと実行ができる
- その他の user は、読みのみできる

## user

各 process は、どの user として動作するかを示す属性を持つ。
これを credential といい、user id が識別子になる。

kernel は process のもつ user id をみて、その process がこの file に行うアクセスの権限を判定する。

ある user id をもつ process は、そこから fork された process にもその user id が引き継がれる。
だから login user から process を起動すれば、基本全部 login user で実行できるというわけ。

user id と user name の対応マスタは /etc/passwd で管理されている。
group は /etc/group で管理。
とはいえ、 local macine の /etc/passwd に管理しておくやり方はエンプラではあまりやらない。
ユーザーマスタは LDAP とかを使って remote に保持しておく。
ユーザー系のコマンド使う時は裏側で勝手に remote のユーザーマスタに問い合わせる感じ。
これによって複数マシンで同じユーザーマスタを使えるので、PC を変えても同じ user で login できるようになる。

## 端末(tty)

linux kernel が認識する論理的なユーザーインタフェースのこと。
物理的には、入力用ハードウェアと出力用ハードウェアの 1 組で構成されている。
キーボード(入力用)+プリンタ(出力用)のように、入出力どちらも用意されてないとダメ。
端末ドライバによって、物理的なハードウェアは論理的なインタフェースとしての tty に抽象化される。

こいつも上記 file の一種、 dev/tty\* みたいな name で管理されている。
例えば、 dev/tty0 がキーボード+モニターだとしたら、 dev/tty0 とつながってる stream への書き込みでモニターへの描画、 逆にキーボードに入力すると stream から文字を受け取れる。

物理的には

- テレタイプ
- キャラクタ端末(ダム端末)
- X 端末
- 端末エミュレータ(Terminal.app や iTerms2)

などの種類があって、GUI 環境は X 端末とかの window system 用端末を使って実現している。
X 端末ってのは X Window System(Window system の一種)で使われるやつで、通常 tty7(7 番目の仮想コンソール)に割り当てられている。
仮想コンソールってのは linux OS に最初っから用意されてる制御用の仮想端末(起動時に出てくるコンソール)で、複数ユーザーでの切り替え可能なように 0~6 まで存在する。

X Window System はクラサバ型のシステムで、X Client が kernel とやりとりして標準入出力を受け取り、(つまりこっちが kernel には端末として認識される?)、それを元に X Client は X Server に指示を送って、X Server は実際の画面描画処理を行ったり、キーボードなどの入力用ハードウェアから入力をうけとって、X Client に伝えたりする。
OS X とか linux の GUI 環境ではこれが 1 台のマシン上で行われるけど、X Server と X Client はネットワーク的に離れていても問題ないので、リモートにある X Client が入ったマシンと、手元にある X Sever が入ったマシンをつないで、リモートにあるマシンの GUI アプリケーションを手元のマシンのディスプレイに表示しながら動かしたりできる。

### docker の tty, stdin_open の意味

tty を true にすると、container 上に pts(疑似端末, ssh とか telenet とか network 経由で接続される端末を示す端末 device file)を用意してくれて、container を起動したプロセスに attach された tty と入出力を同期してくれる。

たとえば、tty027 が attach されたシェル上で tty: true でコンテナを実行すると、コンテナ上に pts01 が作られ、tty027 と入出力が同期(仕組み的には pts01 を介してコンテナの kernel と tty027 の stream が結ばれてる?)される。

ホスト上の別 window で開いたコンソール(tty028)から、echo hello とかを tty027 に redirect(tty028 への標準出力を tty027 への標準出力となるように切り替え)すると、コンテナ上のコマンドラインに hello が表示される。(tty027->tty028->pts01 となるから)

stdin_open を開くと、container 内プロセスの実行後も標準入力ストリームを開きっぱなしにしてくれる。
逆にこれが true じゃないと入力をうけつけないから、tty だけ true にしてても container でシェル実行しても入力できない。

## stream

各 stream はファイルディスクリプタによって一意に管理される。
open syscall によって stream が作成され、ファイルディスクリプタが返される。
stream は read, write syscall に該当の fd(file descriptor)を渡すことで読み書きできる。
close syscall によって stream を閉じることができる。
process が終了すれば kernel によってそこで使ってる stream は勝手に閉じられるけど、process あたりの使える stream 数は決まってるので使い終わったら閉じるのがお作法。

process にはその起動時にデフォルトで使える stream が三種類用意されている。
それが 標準入力/標準出力/標準エラー出力の 3 つ。

- 標準入力
  - => その process を実行した端末のキーボード
- 標準出力/標準エラー出力
  - => その process を実行した端末のディスプレイ

にそれぞれつながっている。
ファイルディスクリプタはそれぞれ stdin=0, stdout=1, stderr=2 と決まっている。

つまり、ターミナルエミュレータを起動して login shell を立ち上げた時はこんな感じに動いてると考えられる。

1. ターミナルエミュレータがエミュレートする端末(tty10 とする)が kernel に接続される
2. tty10 で、login shell(shell もプロセス)が起動
3. login shell の標準入力は tty10 のキーボード、つまりターミナルエミュレータを起動したホストマシンのキーボード(実態は dev/tty10 ファイル?)に繋がる
4. login shell の標準出力/標準エラー出力は tty10 のディスプレイ、つまりターミナルエミュレータを起動したホストマシンのウィンドウ(実態は dev/tty10 ファイル?)に繋がる

## shell

端末から直接 linux kernel を触ることはせず、shell がその間を繋ぐインタフェースプログラムとして動作する。
shell も一つのプログラムであり、ユーザーインタフェースを提供し、コマンドのパース->実行を行うのが役割。
リダイレクションやパイプも shell の機能である。

以下のような流れで shell は動作する。

1. tty を繋ぐと shell が立ち上がる
2. tty から shell に入力テキスト(標準入力 stream を通して)が渡される
3. shell はその入力を parse して kernel のシステムコールなどを呼び出し kernel から出力を受け取る
4. tty に受け取った出力テキスト(標準出力およびエラー出力 stream を通して)を返す

### リダイレクション

標準入力、標準出力、標準エラー出力のつなぐ先を切り替える。(通常は端末になっている)

`>`だと上書きモード、`>>`だと追記モードになるので`>>`の方が安全。
標準出力とエラー出力まとめておなじ`FILE`に書きたい場合は `> FILE 2>&1` のように書くイディオムがある。

### パイプ

左コマンドの標準出力を右コマンドの標準入力に渡す。
