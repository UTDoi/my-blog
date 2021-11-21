---
slug: "/blog/linux"
date: "2021-11-21"
title: "linuxについて"
---

# linux(kernel)の三大要素

- process
  - 実行されているプログラム
- file
  - 広義の意味でのファイル
- stream
  - process と file, もしくは process と process をつなぐ入出力パイプ
  - process は process や file 自体にではなく stream に r/w を行うことによって相手の詳細を考えずに一律に操作できる

process <-stream-> process <-stream-> file

# file

- ここでは file は広義のファイルを指すよ、つまり regular file だけじゃなく、directory や symlink, special file(device など)も指すよ
- file にはその file の所有 user, 所有 group, そして permission 属性があるよ
  - デフォルトではその file を作成した user,その user が属する group が所有 user, 所有 group になるよ
  - permission は 所有 user, 所有 group に属する user, その他の user に対する read/write/execute をそれぞれ指定するよ
  - fileA の permission が rwxr-xr--(754) で 所有 user が alice, 所有 group が redclass として、user: bob が group:redclass に属しているとすれば、
    - alice は fileA に読み書き実行全部できる
    - bob は fileA の読みと実行ができる
    - その他の user は、読みのみできる

# user

- 各 process は、どの user として動作するかを示す属性を持つよ
  - これを credential といって、user id が識別子になるよ
  - kernel は process のもつ user id をみて、その process がこの file に行うアクセスの権限を判定するよ
- ある user id をもつ process は、そこから fork された process にもその user id が引き継がれるよ
  - だから login user から process を起動すれば、基本全部 login user で実行できるんだね ˜
- user id と user name の対応マスタは /etc/passwd で管理されてるよ
  - group は /etc/group だよ
  - とはいえ、 local macine の /etc/passwd に管理しておくやり方はエンプラだとあんまないよ
  - ユーザーマスタは LDAP とかを使って remote に保持しておくよ
    - ユーザー系のコマンド使う時は裏側で勝手に remote のユーザーマスタに問い合わせてくれるよ(?)
    - これによって複数マシンで同じユーザーマスタを使えるので、PC を変えても同じ user で login できるようになるよ

# 端末(tty)

- linux kernel が認識する論理的なユーザーインタフェースだよ
  - 物理的には、入力用ハードウェアと出力用ハードウェアの 1 組で構成されてるよ
    - 入出力どちらも用意されてないとダメだよ！！！
      - キーボード(入力用)+プリンタ(出力用) みたいにね
    - 端末ドライバによって、物理的なハードウェアはインタフェースに抽象化されるよ
- こいつも上記 file の一種、 dev/tty\* みたいな name で管理されてるよ
  - 例えば、 dev/tty0 がキーボード+モニターだとしたら、 dev/tty0 とつながってる stream への書き込みでモニターへの描画、 逆にキーボードに入力すると stream から文字を受け取れるよ
  - 物理的には
    - テレタイプ
    - キャラクタ端末(ダム端末)
    - X 端末
    - 端末エミュレータ(Terminal.app や iTerms2)
  - などの種類があって、GUI 環境は X 端末とかの window system 用端末を使って実現してるみたいだよ
    - X 端末ってのは X Window System(Window system の一種)で使われるやつで、tty7(7 番目の仮想コンソール)に割り当てられてるみたいだよ
      - 仮想コンソールってのは linux OS に最初っから用意されてる制御用の仮想端末(起動時に出てくるコンソール)で、複数ユーザーでの切り替え可能なように 0~6 まであっるよ
    - X Window System はクラサバ型のシステムで、X Client が kernel とやりとりして標準入出力を受け取り、(つまりこっちが kernel には端末として認識される?)、それを元に X Client は X Server に指示を送って、X Server は実際の画面描画処理を行ったり、キーボードなどの入力用ハードウェアから入力をうけとって、X Client に伝えたりするよ
    - OS X とか linux の GUI 環境ではこれが 1 台のマシン上で行われるけど、X Server と X Client はネットワーク的に離れていても問題ないので、リモートにある X Client が入ったマシンと、手元にある X Sever が入ったマシンをつないで、リモートにあるマシンの GUI アプリケーションを手元のマシンのディスプレイに表示しながら動かしたりできるよ

## docker の tty, stdin_open の意味

- tty を true にすると、container 上に pts(疑似端末, ssh とか telenet とか network 経由で接続される端末を示す端末 device file だよ)を用意してくれて、container を起動したプロセスに attach された tty と入出力を同期してくれるよ
  - たとえば、tty027 が attach されたシェル上で tty: true でコンテナを実行すると、コンテナ上に pts01 が作られ、tty027 と入出力が同期(仕組み的には pts01 を介してコンテナの kernel と tty027 の stream が結ばれてる?)されるよ
    - ホスト上の別 window で開いたコンソール(tty028)から、echo hello とかを tty027 に redirect(tty028 への標準出力を tty027 への標準出力となるように切り替え)すると、コンテナ上のコマンドラインに hello が表示されるよ(tty027->tty028->pts01 となるから)
- stdin_open を開くと、container 内プロセスの実行後も標準入力ストリームを開きっぱなしにしてくれるよ
  - 逆にこれが true じゃないと入力をうけつけないから、tty だけ true にしてても container でシェル実行しても入力できないよ

# stream

- 各 stream はファイルディスクリプタによって一意に管理されるよ
- open syscall によって stream が作成され、ファイルディスクリプタが返されるよ
  - stream は read, write syscall に fd を渡して読み書きできるよ
- close syscall によって stream が閉じられるよ
  - process が終了すれば kernel によってそこで使ってる stream は勝手に閉じられるけど、process あたりの使える stream 数は決まってるので使い終わったら閉じた方がいいよ
- process にはその起動時にデフォルトで使える stream が三種類用意されているよ
- それが 標準入力/標準出力/標準エラー出力だよ
  - 標準入力は、その process を実行した端末のキーボード
  - 標準出力/標準エラー出力は、その process を実行した端末のディスプレイ
- にそれぞれつながっているよ
  - ファイルディスクリプタは stdin=0, stdout=1, stderr=2 だよ
- つまり、ターミナルエミュレータを起動して login shell を立ち上げた時はこんな感じに動いてるっぽいよ
  - ターミナルエミュレータがエミュレートする端末(tty10 とする)が kernel に接続される
  - tty10 で、login shell(shell もプロセス)が起動
  - login shell の標準入力は tty10 のキーボード、つまりターミナルエミュレータを起動したホストマシンのキーボード(実態は dev/tty10 ファイル?)に繋がる
    - で、標準入力は、多分 read stream
  - login shell の標準出力/標準エラー出力は tty10 のディスプレイ、つまりターミナルエミュレータを起動したホストマシンのウィンドウ(実態は dev/tty10 ファイル?)に繋がる
    - で、標準出力/エラー出力は多分 write stream

# shell

- 端末から直接 linux kernel を触ることはせず、shell がその間を繋ぐインタフェースプログラムとして動作するよ
  - shell も一つのプログラムだよ
    - ユーザーインタフェースを提供し、コマンドのパース->実行を行うのが役割だよ
    - リダイレクションやパイプも shell の機能だよ
  - tty を繋ぐと shell が立ち上がり、tty から shell に入力テキスト(標準入力 stream を通して)が渡され、shell はその入力を parse して kernel のシステムコールなどを呼び出し kernel から出力を受け取り、tty に出力テキスト(標準出力およびエラー出力 stream を通して)を返すみたいな流れだよ

## リダイレクション

- 標準入力、標準出力、標準エラー出力のつなぐ先を切り替えるよ(通常は端末だよ)
  - `>`だと上書きモード、`>>`だと追記モードになるので`>>`の方が安全だね
  - 標準出力とエラー出力まとめておなじ`FILE`に書きたい場合は `> FILE 2>&1` のように書くイディオムがあるよ

## パイプ

- 左コマンドの標準出力を右コマンドの標準入力に渡すよ
