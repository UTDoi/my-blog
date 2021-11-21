# linux(kernel)の三大要素
- process
  - 実行されているプログラム
- file
  - 広義の意味でのファイル
- stream
  - processとfile, もしくはprocessとprocessをつなぐ入出力パイプ
  - processはprocessやfile自体にではなくstreamにr/wを行うことによって相手の詳細を考えずに一律に操作できる

process <-stream-> process <-stream-> file

# file
- ここではfileは広義のファイルを指すよ、つまりregular fileだけじゃなく、directoryやsymlink, special file(deviceなど)も指すよ
- fileにはそのfileの所有user, 所有group, そしてpermission属性があるよ
  - デフォルトではそのfileを作成したuser,そのuserが属するgroupが所有user, 所有groupになるよ
  - permissionは 所有user, 所有groupに属するuser, その他のuser に対するread/write/executeをそれぞれ指定するよ
  - fileA のpermissionが rwxr-xr--(754) で 所有userが alice, 所有groupが redclass として、user: bobが group:redclass に属しているとすれば、
    - aliceはfileAに読み書き実行全部できる
    - bobはfileAの読みと実行ができる
    - その他のuserは、読みのみできる

# user
- 各processは、どのuserとして動作するかを示す属性を持つよ
  - これをcredentialといって、user idが識別子になるよ
  - kernelはprocessのもつuser idをみて、そのprocessがこのfileに行うアクセスの権限を判定するよ
- あるuser idをもつprocessは、そこからforkされたprocessにもそのuser idが引き継がれるよ
  - だからlogin userからprocessを起動すれば、基本全部login userで実行できるんだね˜
- user idとuser nameの対応マスタは /etc/passwd で管理されてるよ
  - groupは /etc/group だよ
  - とはいえ、 local macineの /etc/passwd に管理しておくやり方はエンプラだとあんまないよ
  - ユーザーマスタはLDAPとかを使ってremoteに保持しておくよ
    - ユーザー系のコマンド使う時は裏側で勝手にremoteのユーザーマスタに問い合わせてくれるよ(?)
    - これによって複数マシンで同じユーザーマスタを使えるので、PCを変えても同じuserでloginできるようになるよ

# 端末(tty)
- linux kernelが認識する論理的なユーザーインタフェースだよ
  - 物理的には、入力用ハードウェアと出力用ハードウェアの1組で構成されてるよ
    - 入出力どちらも用意されてないとダメだよ！！！
      - キーボード(入力用)+プリンタ(出力用) みたいにね
    - 端末ドライバによって、物理的なハードウェアはインタフェースに抽象化されるよ
- こいつも上記fileの一種、 dev/tty* みたいなnameで管理されてるよ
  - 例えば、 dev/tty0 がキーボード+モニターだとしたら、 dev/tty0 とつながってるstreamへの書き込みでモニターへの描画、 逆にキーボードに入力すると stream から文字を受け取れるよ
  - 物理的には
    - テレタイプ
    - キャラクタ端末(ダム端末)
    - X端末
    - 端末エミュレータ(Terminal.appやiTerms2)
  - などの種類があって、GUI環境はX端末とかのwindow system用端末を使って実現してるみたいだよ
    - X端末ってのはX Window System(Window systemの一種)で使われるやつで、tty7(7番目の仮想コンソール)に割り当てられてるみたいだよ
      - 仮想コンソールってのはlinux OSに最初っから用意されてる制御用の仮想端末(起動時に出てくるコンソール)で、複数ユーザーでの切り替え可能なように0~6まであっるよ
    - X Window Systemはクラサバ型のシステムで、X Clientがkernelとやりとりして標準入出力を受け取り、(つまりこっちがkernelには端末として認識される?)、それを元にX ClientはX Serverに指示を送って、X Serverは実際の画面描画処理を行ったり、キーボードなどの入力用ハードウェアから入力をうけとって、X Clientに伝えたりするよ
    - OS XとかlinuxのGUI環境ではこれが1台のマシン上で行われるけど、X ServerとX Clientはネットワーク的に離れていても問題ないので、リモートにあるX Clientが入ったマシンと、手元にある X Severが入ったマシンをつないで、リモートにあるマシンのGUIアプリケーションを手元のマシンのディスプレイに表示しながら動かしたりできるよ

## dockerのtty, stdin_openの意味
  - ttyをtrueにすると、container上にpts(疑似端末, sshとかtelenetとかnetwork経由で接続される端末を示す端末device fileだよ)を用意してくれて、containerを起動したプロセスにattachされたttyと入出力を同期してくれるよ
    - たとえば、tty027がattachされたシェル上でtty: trueでコンテナを実行すると、コンテナ上にpts01が作られ、tty027と入出力が同期(仕組み的にはpts01を介してコンテナのkernelとtty027のstreamが結ばれてる?)されるよ
      - ホスト上の別windowで開いたコンソール(tty028)から、echo helloとかをtty027にredirect(tty028への標準出力をtty027への標準出力となるように切り替え)すると、コンテナ上のコマンドラインにhello が表示されるよ(tty027->tty028->pts01となるから)
  - stdin_openを開くと、container内プロセスの実行後も標準入力ストリームを開きっぱなしにしてくれるよ
    - 逆にこれがtrueじゃないと入力をうけつけないから、ttyだけtrueにしててもcontainerでシェル実行しても入力できないよ

# stream
- 各streamはファイルディスクリプタによって一意に管理されるよ
- open syscallによってstreamが作成され、ファイルディスクリプタが返されるよ
  - streamは read, write syscall にfdを渡して読み書きできるよ
- close syscallによってstreamが閉じられるよ
  - processが終了すればkernelによってそこで使ってるstreamは勝手に閉じられるけど、processあたりの使えるstream数は決まってるので使い終わったら閉じた方がいいよ
- processにはその起動時にデフォルトで使えるstreamが三種類用意されているよ
- それが 標準入力/標準出力/標準エラー出力だよ
  - 標準入力は、そのprocessを実行した端末のキーボード
  - 標準出力/標準エラー出力は、そのprocessを実行した端末のディスプレイ
- にそれぞれつながっているよ
  - ファイルディスクリプタは stdin=0, stdout=1, stderr=2 だよ
- つまり、ターミナルエミュレータを起動してlogin shellを立ち上げた時はこんな感じに動いてるっぽいよ
  - ターミナルエミュレータがエミュレートする端末(tty10とする)がkernelに接続される
  - tty10で、login shell(shellもプロセス)が起動
  - login shellの標準入力はtty10のキーボード、つまりターミナルエミュレータを起動したホストマシンのキーボード(実態はdev/tty10ファイル?)に繋がる
    - で、標準入力は、多分read stream
  - login shellの標準出力/標準エラー出力はtty10のディスプレイ、つまりターミナルエミュレータを起動したホストマシンのウィンドウ(実態はdev/tty10ファイル?)に繋がる
    - で、標準出力/エラー出力は多分write stream

# shell
- 端末から直接linux kernelを触ることはせず、shellがその間を繋ぐインタフェースプログラムとして動作するよ
  - shellも一つのプログラムだよ
    - ユーザーインタフェースを提供し、コマンドのパース->実行を行うのが役割だよ
    - リダイレクションやパイプもshellの機能だよ
  - ttyを繋ぐとshellが立ち上がり、ttyからshellに入力テキスト(標準入力streamを通して)が渡され、shellはその入力をparseしてkernelのシステムコールなどを呼び出しkernelから出力を受け取り、ttyに出力テキスト(標準出力およびエラー出力streamを通して)を返すみたいな流れだよ

## リダイレクション
- 標準入力、標準出力、標準エラー出力のつなぐ先を切り替えるよ(通常は端末だよ)
  - `>`だと上書きモード、`>>`だと追記モードになるので`>>`の方が安全だね
  - 標準出力とエラー出力まとめておなじ`FILE`に書きたい場合は `> FILE 2>&1` のように書くイディオムがあるよ

## パイプ
- 左コマンドの標準出力を右コマンドの標準入力に渡すよ
