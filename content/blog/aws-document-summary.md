---
published: true
date: "2020-11-21"
title: "AWS公式documentの雑サマリ"
slug: "/blog/aws-document-summary"
---

AWS の公式 document の内容をサービス別に雑にサマってみた。

## IAM

IAM で重要な概念は以下の 3 つ。

### User

認証は ID&Pass もしくは ACCESS_KEY&SECRET_KEY で行う。

セキュリティのため(KEY が漏洩しやすいから)User にはほとんど権限を与えず、必要な policy が attach された Role を別途用意し、User 認証後に そちらに Switch する運用が多い。

### Role

role を付与されたリソースは、sts に対して role の arn を指定して assume role リクエストを送って credential を取得し、それを使うことで role に付与された policy の権限セットでアクセスできるようになる。

だから role には assume role に関する policy(信頼 policy)を設定して、assume role を許可する principal を限定する必要がある。

assume role で得られる credential は short-term なことに注意。

### Policy

policy は usecase で大別すると以下の 3 つに分類できる。

- Identities(user, group or role)ベース policy
  - user, group, role に attach する
  - attach した identity がどんな Resource にどんな action をできるか規定する
- Resource ベース policy
  - AWS Resource に対して attach する
  - attach した Resource に対して、どの Principal がどんな action をできるか規定する
  - policy を attach できる AWS リソースは決まっている
    - 例えば S3 とか OpenSearch とかが可能
    - S3 の bucket policy とかが代表例
- 信頼 policy(assume role policy)
  - role に attach する
  - attach した role に対する AssumeRole リクエストを sts が許可する Principal を規定する

Resource ベース policy が atttach された Resource に、Identities ベース policy が attach された indentity からアクセスする場合は、
双方の policy は

```
明示的な拒否(Deny) > 明示的な許可(Allow) > 暗黙的な拒否(未設定、デフォルト)
```

の順に優先されて評価される。

## Lambda

### execution role

Lambda function が invoke されるときに assume する role のこと。
実態は iam role である。

default だと CloudWatch へのアクセス(?)のみが許可された minimal な policy が attach された role が暗黙的に作られ、assume される。

### concurrency

Lambda は request を受けるごとに新しく実行インスタンスを起動してリクエストを受ける。
この、起動された台数=時間あたりにいくらリクエストを捌けるかを concurrency と呼んでいる。

Burst limit を超える台数起動されちゃうと、そっから先は 500 台/min ごとしか起動できなくなってしまう。
tokyo region では 1000 が burst limit である。

burst limit 超えて、concurrency limit まで行っちゃうとそっから先はもはや台数を増やせなくなる。
concurrency limit はデフォで 1000 だけど、AWS に頼めば増やしてもらえる。

インスタンスを起動する際にはコードの読み込みや初期化が必要だから、起動には結構時間がかかってしまう。(コールドスタート)

そのため、事前にセットアップを済ませた(ウォームスタート)実行インスタンスを何台か用意しておける。
これを Provisioned Concurrency と呼ぶ。
これを使えばリクエストが spike しても scale 間に合わなくて throttling にひっかかるみたいなのを防げる。

### Layer

artifact(npm_modules とか vendor/bundle とかライブラリが主)を共有しておける機能のこと。
Lambda からアクセスできる共有ストレージみたいなイメージ。

### ConnectToVPC

Lambda は AWS 管理のネットワーク上に配置されている。
そのため、ユーザが作った VPC の private subnet 内にあるリソースへのアクセスは基本無理である。
とはいえ、private subnet を public subnet にするのも嫌なはず。
そこで、ENI 経由で Lambda から private subnet にアクセスする仕組みがある。

Lambda function invoke 時に都度 ENI を作成し、その ENI を対象の private subnet に所属させ、そいつ経由で Lambda が private subnet 内のリソースにアクセスすることができるようになる。
また、その ENI には SG も設定できる。

ちなみに現在では ENI は都度作成せず、最初に作ったものを使いまわす仕組みになっているためそこまでコストはかからないようになっている。
Lambda から ENI につなぐときに NAT 通してるから複数台で使いまわせる。

上記のような仕組みを一般に VPC 内 Lambda と呼んでいる。
実際には Lambda の実行インスタンス自体は VPC 内におらず、いるのは ENI なので誤解しやすいかも。

### metrics

function が execute されるたびに、CloudWatch に metrics を送っている。

Invocations は function が実行された数で、success も error も含むけど、throttle とかで execute 自体が行われなかった時は count されない。

### logs

function 実行時に出力される log は、勝手に CloudWatchLogs に送信される。
execution role に、CloudWatchLogs へのアクセス policy を attach しとく必要があるから注意すること。

事前に CloudWatchLogGroup を作成しとくと、そいつに対して log が送信される。
`/aws/lambda/<function name>.`って名前の LogGroup にしとけば OK。

ちなみに、必ずしも事前に LogGroup を作っておかなくてもよく、存在しない場合は Lambda 側で勝手に作ってくれる。

### datadog lambda layer

datadog では lambda からメトリクス送るためのライブラリを lamnda layer の形で提供している。
`arn:aws:lambda:<AWS_リージョン>:464622532012:layer:Datadog-<ランタイム>:<バージョン>`って感じで arn 指定するととってこれるようになっている。

中身は各ランタイム向けの package である。
例えば node.js の場合 datadog-lambda-js って npm package が入ってくる。

## VPC

AWS 内で使われる仮想ネットワークである。各 VPC は独立したネットワークになっている。
作成するときに CIDR ブロックを指定して、IP アドレスの範囲を決める(subnetmask は 16 でやることが多い)。

VPC は全 AZ に跨って作成される。
1AZ に対して複数の subnet を作成できる(逆に言うと、subnet は AZ を跨げない)。
subnet にも CIDER を指定してアドレス範囲を決める(だいたい/24)。

AWS アカウント作成時に勝手に各 Region に defaultVPC が作られる。
ec2 や ELB, RDS とかは作成時に VPC を指定しなければ defaultVPC の中に作られる。

### subnet

各 subnet は 1 つの route table と紐付けられる。
route table は、subnet 外に出る outbound traffic の行先を、Destination IP を元に routing するやつ。
subnet 作成時に何も指定しなければ、所属 VPC の main route table が勝手に紐付けられる。
main route table の中身は変更することもできる。

InternetGW を持ち、route table で defaultGW(0.0.0.0/0, つまり outbound traffic に対する routing 先)として InternetGW が指定されていて、中のインスタンスが public IP を持つように設定されたものを public subnet という。
つまり public subnet はインターネットへの通信もできるし、インターネットからの通信も返せる。
中に配置する ec2 には ElasticIP を割り当てて、インターネットから安定して(default の public IP だと毎回かわっちゃう)通信できるようにすることが多い。

InternetGW を持たないものを private subnet という。
インターネットとの通信は一切できない。

InternetGW は持たないが、NAT インスタンスをもち defaultGW として NAT を指定してるものを protected subnet という。
internet への outbound traffic とその戻りの通信のみ通ることになる。
package の取得などでインスタンスから internet へのアクセスは行いたいが Internet からのアクセスは許したくない場合にこれを使う。

### NetworkACL

subnet ごとに設定できる firewall である。
SG の rule と似てるけどこっちは Allow も Deny も指定できる。
また SG と違って Stateless なので、戻りの通信も考慮して Allow や Deny をしなきゃいけない。

### Internet Gateway

Internet との通信に使う component で、高い scalability と耐久性、可用性をもつ。

こいつを利用することで、以下の手順で Internet 通信が可能になる。

1. Internet Gateway を VPC に attach
2. subnet に route table を設定し、インターネットアクセスを許可したい Destination(全部なら 0.0.0.0/0, 特定のサイトだけならそいつの IP)に対し Internet Gateway への routing を設定する
3. Internet 通信したいインスタンスに Public IP を設定する
4. Internet 通信したいインスタンスの SG,所属 subnet の NetworkACL で、対象通信先に穴あけ

Internet Gateway は 1to1 NAT の役割をはたす。
privateIP と publicIP の mapping をしてくれることによって、Internet との通信が可能になる。

### NAT device

protected subnet から Internet への通信を行いたい時は、NAT device を通じて行える。

privateIP と送信元 port の組み合わせを記憶して、実際の通信先には NAT に割り当てられた publicIP でアクセス、response のヘッダに含まれてる port から privateIP への変換を行い、traffic を通信元に届ける。(要は NAPT)

NAT device には managed な NATGateway と、unmanaged で ec2 インスタンス上に作成する NATInstance の二種類がある。
何か理由がない限り managed な NATGateway を使った方がいいとのこと。

#### NAT Gateway

protected subnet から NAT Gateway 経由で Internet にアクセスしたい場合、まずは public subnet に NAT Gateway を配置し、そいつに ElasticIP を割り当てる必要がある。
そして、NAT Gateway を通したい protected subnet の route table の default gateway に NAT Gateway の id を指定してあげれば準備 OK。
つまり protected subnet 内 instance -> NAT Gateway -> InternetGateway のように routing させる。

subnet に 1 つ配置するタイプの component であるため、必然的に 1AZ に 1 つ配置されることになる。
そのため、可用性高めたい時は複数 AZ(subnet)に 1 つずつ配置するようにした方がいい。

#### RouteTable

subnet もしくは gateway からの outbound traffic をどこに routing するか決めるための rule set である。

作成した VPC には、勝手に main route table が作成されて紐付けられる。
全ての subnet は、custom route table を指定しなかった時この main route table が適用される。

Destination で通信元の指定した通信先 IP を定義し、それに対応する Target で routeing 先の gateway の id などを指定する。

#### VPC endpoint

ユーザー VPC 外の AWS リソース(S3)とかに、インターネット経由しなくても VPC 内からアクセスできる機能。
AWS PrivateLink が利用されている。

タイプとしては、Interface endpoints, Gateway Load Balancer endpoints, Gateway endpoints の 3 つがある。

##### Interface endpoints

今はこっちが主流で、ほとんどの service が対応している。

指定した subnet 内に endpoint につながった ENI が立ち上がる仕組み。
もちろんそいつには private IP が与えられるので、VPC 内で通信ができるようになるという感じ。

##### Gateway endpoints

かつて主流だったやつ。
S3 と dynamoDB しか対応してない。

GateWay を VPC に attach して、route table で service endpoint の Destination に対して VPC endpoint GW を routing するという仕組み。

service endpoint は public IP に名前解決されて、実際には instance からは public IP にリクエストがいくので、NetworkACL で local VPC 以外への outbound を Deny とかすると失敗してしまうことに注意。
instance からは private IP でリクエストできるので多分、内部では NAT 的な動作をしていそう。

## EC2

### networking

ec2 インスタンスに subnet を指定すると、仮想 NIC が作られてインスタンスに付与される。
仮想 NIC には subnet から private IPv4 アドレスが紐付けられる。
インスタンスが terminate されるまで NIC と IP アドレスの紐付けは維持される。
private IPv4 アドレスへ名前解決する内部 DNS 用 domain 名(ip-10-251-50-12.ec2.internal とか)も勝手に追加される。
この内部 DNS は、同じ VPC 内でしか名前解決できないことに注意。

public IP アドレスの attach も可能だけど、default だと AWS で保有してるアドレスプールから割り当てられるから日々変わる可能性がある。
固定 IP が欲しいなら Elastic IP を利用する必要がある(ただし追加課金がいる)。
public IP アドレスに対応する domain 名( ec2-203-0-113-25.compute-1.amazonaws.com とか)も勝手に追加される。
また、public IP アドレスは、NAT によって primary private IP に勝手に紐付けられる。

#### ENI

AWS で使用される仮想 NIC。
ec2 インスタンスが VPC において network 通信を行うためのインタフェースとして使われる。
どの subnet において、どの SG で作成するかを指定可能。

ec2 インスタンスはデフォルトで eth0 って ENI が attach された状態で起動される。
もちろん新しく ENI を作ってインスタンスに付与することで、mac アドレス, IP アドレスを 1 インスタンスに 2 以上付与することが可能。

### instance profile

インスタンスに紐づける role を指定するコンテナのこと。
インスタンスは、ここで指定された role に assume role しにいく。

### Security Group

ec2 インスタンスの仮想 firewall として機能してくれるやつ。
実態としては ec2 インスタンス自体じゃなくて ENI に付与されてるものだから、ec2 インスタンスについてる ENI ごとに SG を変えることができる。

ec2 への inbound/outbound traffic に対する rule を設定できる。
default では port 25 からの outbound は禁止されている(spam mailer として使われるのを防ぐためとのこと)。
deny は指定できず、allow のみ指定できる。

IP address(Source/Destination), protocol, port range の組み合わせに対して allow リストを作成できる。
例としては、

- inbound rule
  - `Source: 192.168.2.11, protocol: TCP, port range: 80` => 192.168.2.11 からの HTTP80 番ポートアクセスを許可する
- outbound rule
  - Destination: `192.168.2.3, protocol: TCP, port range: 0-65555` => 192.168.2.3 への 0-65555(ephemeral port をふくむように)での TCP アクセスを許可

Source/Destination には IP だけじゃなく SG も指定できる。
例えば、自身の SG そのものを Source に指定したら、同じ SG に属するやつからの inbound traffic を許可する感じになる。

NetworkACL と違って Stateful である。
つまり、allow された inbound traffic(=SG 外からの request)に対する outbound traffic(SG 外への response)は、outbound rule に関係なく許可される。
allow された outbound traffic(=SG 外への request)に対する inbound traffic(SG 外への response)も、inbound rule に関係なく許可できる。

Stateful であることにより、

- Ingress => どいつからのどのポートへのアクセス(こっちへの request)を許可するか
- Egress => どいつへのどのポートでのアクセス(こっちからの request)を許可するか

というようにシンプルにリクエストだけを考えて制御設計ができるようになる。

defaultVPC には defaultSecurityGroup が勝手に作られてて、何も指定せず ec2 インスタンス作るとそいつが attach される。
default rule は以下のようになっている。

- defaultSG からの inbound は全て許可する(逆に言うと、defaultSG 以外からの inbound は全て拒否されている)
- outbound は全て許可する

また、defaultSG は削除することができない。
削除できちゃうと、その VPC で作った ec2 インスタンス作成時に SG を指定しなかった場合何を attach していいかわからなくなるからかと思われ。

custom SG 作ってインスタンス作るときにそいつ指定すれば、defaultSG じゃなくて指定した方が attach される。
customSG は VPC ごとに作れるが、VPC 間で SG の共有はできない。

## S3

### アクセス制御

種類としては

- ACL
  - AWS account 単位で bucket, object へのアクセス権限を定義できる
- bucket policy
  - bucket, object への resource-based policy
- IAM policy

の 3 つ

### PublicAccessBlock 設定

Public(全世界公開)な ACL, bucket policy が適用されないように block する仕組みを提供してくれる機能。
AWS Account(つまりその Account が所有する bucket すべて)もしくは個別の bucket に対して設定可能。
具体的には以下のような設定がある。

- block_public_acls
  - public な ACL が新規作成されるのを防ぐ
- block_public_policy
  - public な bucket policy が新規作成されるのを防ぐ
- ignore_public_acls
  - public な ACL が無視される
- restrict_public_buckets
  - public な bucket policy or ACL が適用されたとしても、認証なしにはアクセスできないようにする(?)

## CloudWatch

AWS リソースの各種 metrics を収集してくれるサービス。

CloudWatch は基本的には metrics の repository として機能する。
EC2 とかの AWS サービスが metrics を repository に送信する、push 型 architecture である。
S3 とか Lambda の managed なものは何も設定しなくても勝手に metrics 送信してくれるけど、ec2 とかは統合 CloudWatch agent を install しないといけない。

CloudWatch には Dashboard 画面があり、収集した metrics をグラフ化して表示できる。
metrics を元に Alarm も設定できる。
SNS と連携して、Alarm を slack とかに飛ばすこともできる。
ASG と連携して、alarm がなったら instance 台数増やすみたいなこともできる。

namespace によって metrics がグルーピングされる。
AWS リソースが勝手に送信してる分は、その Service 名を元にした namespace になっている。
(例. AWS/S3)

## CloudWatchLogs

ec2, s3, cloudtrail とかの AWS リソースから送られる log をためておける。
こっちも metrics と同じく、s3 とかは設定なしでいいけど ec2 とかは統合 CloudWatch agent を install する必要がある。

ためておいた log は検索したり、解析したりできる。
log の内容を元に alarm を作成したりできる。

### log event

リソースが送ってくる log レコード 1 つ 1 つのことを指す。
log event はロギング日時とログメッセージ内容のセットで構成されている。

### log stream

log event を発生させる source と 1:1 で結びつく stream。

### log group

log stream をまとめるためのグループ。
web サーバーを複数台で運用してる場合とかは log stream がばらけるので、log group でまとめることが多い。

### metric filter

log event の message から metrics を抽出し、そいつを CloudWatchMetrics に変換するやつ。
log group に対して設定できて、設定した metric filter は log group 内の全 log stream に適用される。

## Elastic Load Balancing

Application Load Balancer, Classic Load Balancer など複数種類がある。

load balancer は最低 2AZ に配置されるようにしないといけない。
作成するとき、最低 2AZ に配置されるように配置 subnet を指定してあげましょう。

public subnet に ALB をおいて、そいつにぶら下げる ec2 は private(protected が多いけど)subnet におくのがよくある構成。

## aws CLI

最低限の configure は aws configure コマンドで出てくるウィザードで可能。
ACCESS_KEY, SECRET_ACCESS_KEY, region, output_format を configure として保持する。

そもそも AWS の API 叩くには署名つきリクエストしないといけなくて、署名には ACCESS_KEY, SECRET_ACCESS_KEY が必要である。
aws CLI はその署名を裏側で勝手にやってくれる。

configure を local に複数保持することもできて、1 つ 1 つを profile と呼ぶ。
aws configure --profile で指定すれば任意の名前の profile に保存できるけど、指定しなかったら"default"って名前の profile に保存される。

## OpenSearch

本番環境とかでは、専用 master node を用意し、かつ MultiAZ 構成にすることが多い。
AZ は 2 つか 3 つを指定できる。

MultiAZ にする目的は耐久性と可用性の向上である。
つまり適当に MultiAZ にするだけではだめで、複数の AZ に primary shard とその replica がまたがって配置されるようにしないといけない。
ということで、data node の数は AZ の数以上、replica shard の数は 1 以上を守る必要がある。

## Kinesis

2021 年 10 月現在、Service が 4 種類ある

- Kinesis Video Streams
- Kinesis Data Streams
- Kinesis Data Firehose
- Kinesis Data Analytics

一番使うのは Kinesis Data Streams。
Streams は consumer 側は lambda だったり EC2 だったりを自由に選択できる。

Firehose は S3 とか Redshift とかに stream data を batch 的に送る managed なパイプ。

### Kinesis Data Streams

stream データの最小単位を data record と呼んでいる。
data record の stream が shard 単位で流れる。
data record は 同一 shard 内で unique で単調増加な sequence number をもっている。
number は record が write されるごとに increment される。
shard の単位で producer が stream に record を流し、consumer が受け取るといった構成。

shard 数を指定して stream を作成する。
data record の保持期間を retention period と呼び、デフォルトで 24 hours(max で 1year までのばせる)。

#### Pricing & Quota

課金体系としては、以下 2 軸での課金の合算。

- shard 単位での時間課金
- PUT した data 量

サービス制限は以下のようなものがある。

- default では 1 AWS account で 500 shard までが上限
- 1 shard で 1MB/sec もしくは 1000records/sec の書き込みスループット上限
  - scale させたいなら shard の数を増やすこと
- 読み込みスループット上限は 10MB/sec もしくは 10000records/sec
  - 読み取りトランザクションは 1shard あたり 5 回/sec まで可能

#### Producer

data stream に data record を publish するやつ。
stream 名、partion key, data blob を指定して stream に push する。
partion key によってその data record がどの shard に入るのかが決まる。

##### Kinesis Producer Library(KPL)

kinesis data streams への data record 送信を楽にしてくれる library。
以下のような特徴がある。

- retry を自動でやってくれる
- record を aggregate したり、collection を作って PUT_RECORDS したり batch 的なことを行い、スループットを高めてくれる
  - aggregate は、application から KPL に送る単位での record を、Kinesis Data Stream で扱う data record の単位(partion key, sequence number, payload blob の組)に集約してくれる機能
  - collection は、複数の kinesis data stream data record をまとめて PUT_RECORDS してくれる機能

#### Consumer

data stream から data record を subscribe するやつ。

Lambda function を consumer として使うと、比較的手軽に実装ができる。
アプリケーションエンジニアは基本的には data records を引数とする関数を記述するだけでよく、以下のような動きを裏側で勝手にやってくれる。

- 対象の stream を HTTP リクエストで polling する
- その時点で取得できる複数 record をまとめて params とし、function を invoke
- function 実行中に fail したら、自動で retry してくれる

##### Kinesis Client Library(KCL)

また、Kinesis Client Library(KCL) を使うと、任意のアプリケーションに対し consumer 機能を手軽に組み込める。

同一の stream application においては必ず shard:record_processor=1:1 になるので、ある shard が同一 stream application の(同じ管理用 dynamodb table を使っている)複数の record_processor から同時に consume されることはない。
stream application 名は、KCL の初期化時に設定する。
複数 pod や ec2 インスタンスで同一の stream application 名を使えば、それらの間で並列に分散処理を行えることになる。
例えば、以下のような割り当てがなされる。

- shard1 <- applicationA-pod1, applicationB-pod1
- shard2 <- applicationA-pod2, applicationB-pod2

KCL は Java の Library なので、他言語で使いたい時は deamon として background 起動したプロセスを呼び出す形となる。

- 構成
  - KCL consumer application
    - 1 つの stream を分散処理する consumer の単位
  - KCL consumer application instance
    - 上記 application のインスタンス
    - インスタンス間で共通の dynamoDB 管理テーブルを使用する
  - Worker
    - KCL consumer application instance が 1 つだけもつ、処理の起点となる class
    - shard と worker の割り当て管理や、stream からの record 取得などの管理系のタスクを実行する
      - shard と worker の binding 情報は lease と呼ばれている
        - 1shard と 1worker の bind で 1lease
        - 1worker は複数 lease を獲得可能である
        - ある shard の lease を複数 worker が同時に獲得することはできない
      - lease は KCL consumer application ごとに固有の dynamoDB table で管理される
        - これを lease table と呼んでいる
    - KCL 1 系では Worker と呼ばれているが、2 系では Scheduler と呼ばれている
  - Record Proccesor
    - Worker が保有する、data record 処理用のロジック
      - 典型的には thread で実装される
    - record processor と shard は 1 対 1 対応である
- lease table について詳細
  - lease table 名は consumer application 名から作成されるので、並列処理したい単位ごとに application 名は unique にすること
  - data stream の 1shard ごとに row が unique になる
    - そのため、1 consumer application で 1 data stream しか consume しないなら、primary key である "leaseKey" は "shardId"と一致する
      - 複数 data stream を consume するなら、leaseKey は account-id:StreamName:streamCreationTimestamp:ShardId という format になる
  - カラムは以下の通り
    - leaseKey
    - shardID
    - streamName
    - checkpoint
      - data record をどこまで読んだかの offset
    - leaseOwner
      - その lease の owner である worker
    - leaseCounter
      - owner が 定期的に値を increment することで、自身が unhealthy でないことを示すカウンタ
        - これが一定時間更新されないと、他の worker が owner を奪い shard の処理を引き継ぐ(fail over)
  - lease table と現在の shard-worker の binding 状態との同期は、consumer application の bootstrap 時や reshard のタイミングで実行される
- shard からの record 取得は 一定間隔での polling で実行される
  - idleTimeBetweenReadsInMillis で間隔 ms の設定が可能
  - default だと 1s
- 重複レコードが発生しうる(at least once)
  - producer 側で、put request の response がネットワークの途中で lost したとかで retry をおこなった場合とか
  - consumer 側で、data record の process が完了した後 checkpoint の更新処理に入る前に hung して shutdown した場合、再開した他の worker で再度同じ checkpoint からの処理になるので record を重複して処理することになる
- fail over や worker 追加時
  - worker たちは refresh thread, taker thread を立ちあげ、定期的に lease table の leaseCounter を更新 & 状態を監視している
    - failovertime 経過ごとに上記の動作を行っているっぽい
  - その時、leaseCounter が前確認した時と変わっていない場合は担当 owner が死んだとみなし、処理を引き継ぐために owner を奪いにいく
  - また、worker を追加した時は新規に立ち上げた worker が他の owner の lease を奪いにいく
    - 奪われた owner(Record Processor)は 自身が owner でなくなったことを検知すると、shutdown Exception を出して処理を終了する
  - http://cloudsqale.com/2020/05/20/kinesis-client-library-kcl-2-x-consumer-load-balancing-rebalancing-taking-renewing-and-stealing-leases/
- 実装について
  - まず RecordProcessor を実装する
    - com.amazonaws.services.kinesis.clientlibrary.interfaces.v2.IRecordProcessor を implements
    - processRecords メソッド内で、ProcessRecordsInput を受け取って任意の処理を行う実装をする
      - 正常に実行できたら、checkpoint の記録処理を行うこと
        - これは手動で実装する必要がある
    - shutdown メソッド内で、 record processor が終了する前の cleanup 処理などを行う
      - shutdown メソッドは必ず processRecords メソッドが呼ばれた後に呼ばれる(多分 catch 的なやつの中で呼ばれてる)
      - shutdown reason を取得できる
        - reason が TERMINATE の時は, processRecords は正常に処理を実行しているはずなので、 checkpoint をちゃんと記録する処理を書くようにするといい
          - そうでない場合は、処理の実行に失敗してるはずなので失敗時点から処理を再実行させるために checkpoint の記録はしない方がいい
  - 次に、RecordProcessorFactory を実装する
    - IRecordProcessorFactory を implements
    - createProcessor メソッドを実装し、その中で RecordProcessor インスタンスを返すようにする
    - worker はそこから返される RecordProcessor を使う
  - 最後に、entry point から worker を生成して起動する処理を実装する
    - worker の生成には com.amazonaws.services.kinesis.clientlibrary.lib.worker.Worker.Builder を使う
      - recordProcessorFactory や config などを渡しつつ build する
      - 作った worker の run メソッドを呼び出すと、 worker が起動する
        - worker の startGracefulShutdown を呼び出すと、record processor スレッドが processRecords を実行し切ってから終了する(graceful shutdown)できる
          - JVM の addShutdownHook に引っかけとくといい
        - graceful shutdown を受けると RecordProcessor 側では shutdownRequested メソッドが呼ばれる

## DynamoDB

### 構成要素

- table
  - RDB の table と同じ感じ items の集合
- item
  - RDB の row と同じ感じ attribute の集合
  - attribute のうち primary key に指定したものによって unique となる
- attribute
  - RDB の column と同じ感じ
    - もちろん schemaless
    - nested にもできて 32 階層まで nest 可能

### Primary key

table の item を一意に決める key である。
以下の 2 種類のうちどちらかを使える。

- partition key
  - 1 つの attribute から構成される key
  - hash 関数に通して、item を格納する partition を決定するために使われる
- composite primary key
  - 2 つの attribute から構成される key
    - 1 つめの attribute は partition key として使われる
    - 2 つめの attribute は sort key として使われる
  - 1 つめの attribute で partition が分けられ、それぞれの partition の中で 2 つ目の attribute が sorted index として保持されるイメージ？

### Secondary Index

以下 2 種類がある。

- global secondary index
  - composite primary key を持ったテーブルを、元のテーブルから新たに作成するイメージ
    - といっても index 用 table なのでここでの partition key は一意である必要はない
- local secondary index
  - primary key で partitioing されたそれぞれの partition に追加できる sorted index っぽい

### capacity mode

read/write capacity に関して以下 2 つの mode を選択できる。

- on demand
  - on demand といえども、peek に対して scale するまでには一定の時間がかかることに注意
- provisioned
