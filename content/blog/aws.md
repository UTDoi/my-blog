---
slug: "/blog/aws"
date: "2021-11-21"
title: "awsについて"
---

# IAM

## User

- 認証は ID&Pass もしくは ACCESS_KEY&SECRET_KEY で行うよ
- セキュリティのため(KEY が漏洩しやすいから)User にはほとんど権限を与えず、認証後に必要な policy が attach された Role に Switch する運用がほとんどだよ

## Role

- role を付与されたリソースは、sts に対して role の arn を指定して assume role リクエストを送って credential を取得して、それを使うことで role に付与された policy の権限セットでアクセスできるよ
  - だから role には assume role に関する policy(信頼 policy)を設定して、assume role を許可する principal を限定する必要があるよ
  - 得られる credential は short-term だよ

## policy

policy は usecase で大別すると以下の 2 つだよ

- Identities(user, group or role)ベース policy
  - user, group, role に attach するよ
  - attach した identity がどんな Resource にどんな action をできるか規定するよ
- Resource ベース policy
  - AWS Resource に対して attach するよ
  - attach した Resource に対して、どの Principal がどんな action をできるか規定するよ
  - policy を attach できる AWS リソースは決まってて、S3 とか ElasticsearchService とかはできるよ
  - S3 の bucket policy とかが有名だよ
- 信頼 policy(assume role policy)
  - role に attach するよ
  - attach した role に対する AssumeRole リクエストを sts が許可する Principal を規定するよ

Resource ベース policy が atttach された Resource に、Identities ベース policy が attach された indentity からアクセスする場合は、
双方の policy は

```
明示的な拒否(Deny) > 明示的な許可(Allow) > 暗黙的な拒否(未設定、デフォルト)
```

の順に優先されて評価されるよ

# Lambda

## execution role

- Lambda function が invoke されるときに assume する role のことだよ
- 実態は iam role だよ
- default だと CloudWatch へのアクセス(?)のみが許可された minimal な policy が attach された role が暗黙的に作られ、assume されるよ

## concurrency

- Lambda は request を受けるごとに新しく実行インスタンスを起動してリクエストを受けるよ
  - この、起動された台数=時間あたりにいくらリクエストを捌けるかを concurrency と呼んでるよ
  - Burst limit を超える台数起動されちゃうと、そっから先は 500 台/min ごとしか起動できなくなっちゃうよ
    - tokyo region では 1000 が burst limit だよ
  - burst limit 超えて、concurrency limit まで行っちゃうとそっから先は増やせなくなっちゃうよ
    - concurrency limit はデフォで 1000 だけど、AWS に頼めば増やしてもらえるよ
  - 起動する際にコードの読み込みや初期化が必要だから、結構時間かかっちゃうよ=コールドスタートって呼ぶよ
    - そのため、事前にセットアップを済ませた(ウォームスタートって呼ぶよ)実行インスタンスを何台か用意しておけるよ
    - これを Provisioned Concurrency っていうよ
    - あとこれ使えばリクエストが spike しても scale 間に合わなくて throtteling にひっかかるみたいなのなくなるよ

## Layer

artifact(npm_modules とか vendor/bundle とかライブラリが主)を共有しておける機能だよ
Lambda からアクセスできる共有ストレージみたいなイメージだね

## ConnectToVPC

- Lambda は AWS 管理のネットワーク上に配置されているよ
- なので、ユーザが作った VPC の private subnet 内にあるリソースへのアクセスは基本無理だよ
  - とはいえ、private subnet を public subnet にするのも嫌だよ
- そこで、ENI 経由で Lambda から private subnet にアクセスする仕組みがあるよ
- Lambda function invoke 時に都度 ENI を作成し、その ENI を対象の private subnet に所属させ、そいつ経由で Lambda が private subnet 内のリソースにアクセスするよ
  - ENI には SG も設定できるよ
  - 現在では ENI は都度作成せず、最初に作ったものを使いまわしてるよ
    - Lambda から ENI につなぐときに NAT 通してるから使いまわせるんだよ
- この仕組みを一般に VPC 内 Lambda って言ってるよ
  - 実際には Lambda の実行インスタンス自体は VPC 内にいないけどね
  - 実際にいるのは ENI だよ

## metrics

- function が execute されるたびに、CloudWatch に metrics を送ってるよ
  - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
  - Invocations は function が実行された数で、success も error も含むけど、throttle とかで execute 自体が行われなかった時は count されないよ

## logs

- function 実行時に出力される log は、勝手に CloudWatchLogs に送信されるよ
  - LogGroup は勝手に作られるよ
  - execution role に、CloudWatchLogs へのアクセス policy を attach しとく必要はあるから注意してね
- 事前に CloudWatchLogGroup を作成しとくと、そいつに対して log が送信されるよ
  - `/aws/lambda/<function name>.`って名前の LogGroup にしとけば OK だよ

## datadog lambda layer

datadog では lambda からメトリクス送るためライブラリを lamnda layer の形で提供しているよ
`arn:aws:lambda:<AWS_リージョン>:464622532012:layer:Datadog-<ランタイム>:<バージョン>`って感じで arn 指定するととってこれるよ

中身は各ランタイム向けの package だよ
node.js の場合 datadog-lambda-js って npm package だね

# VPC

- 仮想ネットワークだよ
  - 各 VPC は独立したネットワークになってるよ
- 作成するときに CIDR ブロックを指定して、IP アドレスの範囲を決めるよ(ほとんどのばあい subnetmask は 16 でやるよ)
- VPC は全 AZ に跨って作成されるよ
  - 1AZ に対して複数の subnet を作成できるよ(逆に言うと、subnet は AZ を跨げないよ)
  - subnet にも CIDER を指定してアドレス範囲を決めるよ(だいたい/24 だよ)
- アカウント作成時に勝手に各 Region に defaultVPC が作られてるよ
  - ec2 や ELB, RDS とかは作成時に VPC を指定しなければ defaultVPC の中に作られるよ

## subnet

- 各 subnet は 1 つの route table と紐付けられるよ
  - route table は、subnet 外に出る outbound traffic の行先を、Destination IP を元に routing するやつだよ
  - subnet 作成時に何も指定しなければ、所属 VPC の main route table が勝手に紐付けられるよ
  - main Route Table の中身は変更することもできるよ
- InternetGW を持ち、route table で defaultGW(0.0.0.0/0, つまり outbound traffic に対する routing 先)として InternetGW が指定されていて、中のインスタンスが public IP を持つように設定されたものを public subnet というよ
  - つまりインターネットへの通信もできるし、インターネットからの通信も返せるってことだよ
  - 中に配置する ec2 には ElasticIP を割り当てて、インターネットから安定して(default の public IP だと毎回かわっちゃう)通信できるようにすることが多いよ
- InternetGW を持たないものを private subnet というよ
  - インターネットとの通信は一切できないよ
- InternetGW は持たないが、NAT インスタンスをもち defaultGW として NAT を指定してるものを protected subnet というよ
  - internet への outbound traffic のみ OK だよ
  - package の取得などでインスタンスから internet へのアクセスは行いたいが Internet からのアクセスは許したくない場合にこれが作られる yo

## NetworkACL

- subnet ごとに設定できる firewall だよ
- SG の rule と似てるけど Allow も Deny も指定できるよ
- SG と違って Stateless なので、戻りの通信も考慮して Allow や Deny をしなきゃいけないよ

## Internet Gateway

- Internet との通信に使う component で、高い scalability と耐久性、可用性をもつよ
- 以下の手順で Internet 通信が可能になるよ
  - Internet Gateway を VPC に attach
  - subnet に route table を設定し、インターネットアクセスを許可したい Destination(全部なら 0.0.0.0/0, 特定のサイトだけならそいつの IP)に対し Internet Gateway への routing を設定する
  - Internet 通信したいインスタンスに Public IP を設定する
  - Internet 通信したいインスタンスの SG,所属 subnet の NetworkACL で、対象通信先に穴あけ
- Internet Gateway は 1to1NAT の役割をはたすよ
  - privateIP と publicIP の mapping をしてくれることによって、Internet との通信が可能になるよ

## NAT device

- public subnet から Internet への通信を行いたい時は、NAT device を通じて行えるよ
  - privateIP と送信元 port の組み合わせを記憶して、実際の通信先には NAT に割り当てられた publicIP でアクセス、response のヘッダに含まれてる port から privateIP への変換を行い、traffic を通信元に届けるよ
- NAT device には managed な NATGateway と、unmanaged で ec2 インスタンス上に作成する NATInstance の二種類があるよ
  - 何か理由がない限り managed な NATGateway を使った方がいいよ

### NAT Gateway

- public subnet に NAT Gateway を配置して、ElasticIP を割り当てないとダメだよ
  - そうしないと外部と通信できないからね
  - つまり instance -> NAT Gateway -> InternetGateway のように routing されていくわけだね
  - subnet に配置することなんで、1AZ に配置されることになるから可用性高めたい時は複数 AZ(subnet)に 1 つずつ配置するようにした方がいいよ
- NAT Gateway を通したい private subnet の route table の default gateway に NAT Gateway の id を指定してあげれば準備 OK だよ

### RouteTable

- subnet もしくは gateway からの outbound traffic をどこに routing するか決めるための rule set だよ
- 作成した VPC には、勝手に main route table が作成されて紐付けられるよ
  - 全ての subnet は、custom route table を指定しなかった時この main route table が適用されるよ
- Destination で通信元の指定した通信先 IP を定義し、それに対応する Target で routeing 先の gateway の id などを指定するよ

### VPC endpoint

- ユーザー VPC 外の AWS リソース(S3)とかに、インターネット経由しなくても VPC 内からアクセスできる機能だよ
  - AWS PrivateLink を利用されているよ
  - Interface endpoints, Gateway Load Balancer endpoints, Gateway endpoints の 3 つがあるよ

#### Interface endpoints

- 今はこっちが主流で、ほとんどの service が対応しているよ
- 指定した subnet 内に endpoint につながった ENI が立ち上がるよ
  - もちろんそいつには private IP が与えられるので、VPC 内で通信ができるって感じだよ

#### Gateway endpoints

- S3 と dynamoDB しか対応してないよ
- GateWay を VPC に attach して、route table で service endpoint の Destination に対して VPC endpoint GW を routing するって感じだよ
  - service endpoint は public IP に名前解決されて、実際には instance からは public IP にリクエストがいくので、NetworkACL で local VPC 以外への outbound を Deny とかすると失敗しちゃうよ
  - instance からは private IP でリクエストできるので多分、内部では NAT 的な動作をしてるんだろうね

# EC2

## networking

- ec2 インスタンスに subnet を指定すると、仮想 NIC が作られてインスタンスに付与されるよ
- 仮想 NIC には subnet から private IPv4 アドレスが紐付けられるよ
  - インスタンスが terminate されるまで NIC と IP アドレスの紐付けは維持されるよ
- private IPv4 アドレスへ名前解決する内部 DNS 用 domain 名(ip-10-251-50-12.ec2.internal とか)も勝手に追加されるよ
  - この内部 DNS は、同じ VPC 内でしか名前解決できないよ
- public IP アドレスの attach も可能だけど、default だと AWS で保有してるアドレスプールから割り当てられるから日々変わる可能性があるよ
  - public IP アドレスに対応する domain 名( ec2-203-0-113-25.compute-1.amazonaws.com とか)も勝手に追加されてるよ
  - public IP アドレスは、NAT によって primary private IP に勝手に紐付けられてるよ
- 固定 IP が欲しいなら Elastic IP を利用してね(金はかかるよ)

### ENI

- AWS で使用される仮想 NIC だよ
- ec2 インスタンスが VPC において network 通信を行うためのインタフェースとして使われたりするよ
  - 上で書いた仮想 NIC のことだよ
- どの subnet において、どの SG で作成するかを指定できるよ
- ec2 インスタンスはデフォルトで eth0 って ENI が attach された状態で起動されるよ
  - もちろん新しく ENI を作ってインスタンスに付与することで、mac アドレス, IP アドレスを 1 インスタンスに 2 以上付与することが可能だよ

## instance profile

- インスタンスに紐づける role を指定するコンテナだよ
- インスタンスは、ここで指定された role に assume role しにいくよ

## Security Group

- ec2 インスタンスの仮想 firewall として機能してくれるやつだよ
  - 例の如く、実態としては ec2 じゃなくて ENI に付与されてるものだから、ec2 についてる ENI ごとに SG を変えることができるよ
- ec2 への inbound/outbound traffic に対する rule を設定できるお
  - default では port 25 からの outbound は禁止されてるよ
    - spam mailer として使われるのを防ぐためだよ
  - deny は指定できず、allow のみ指定できるよ
  - IPaddress(Source/Destination), protocol, port range の組み合わせに対して allow リストを作成できるよ
    - inbound rule なら
      - Source: 192.168.2.11, protocol: TCP, port range: 80 みたいな感じにすると、192.168.2.11 からの HTTP80 番ポートアクセスを許可するよ
    - outbound rule なら
      - Destination: 192.168.2.3, protocol: TCP, port range: 0-65555 みたいな感じにすると、192.168.2.3 への 0-65555(ephemeral port をふくむように)での TCP アクセスを許可するよ
    - Source/Destination には IP だけじゃなく SG も指定できるよ
      - 例えば、自身の SG そのものを Source に指定したら、同じ SG に属するやつからの inbound traffic を許可する感じになるよね
- Stateful だよ
  - つまり、allow された inbound traffic(=SG 外からの request)に対する outbound traffic(SG 外への response)は、outbound rule に関係なく許可されるよ
  - allow された outbound traffic(=SG 外への request)に対する inbound traffic(SG 外への response)も、inbound rule に関係なく許可できるよ
  - Stateful なわけだから
    - Ingress => どいつからのどのポートへのアクセス(こっちへの request)を許可するか
    - Egress => どいつへのどのポートでのアクセス(こっちからの request)を許可するか
  - って感じに request だけをシンプルに考えられるよ
- defaultVPC には defaultSecurityGroup が勝手に作られてて、何も指定せず ec2 インスタンス作るとそいつが attach されるよ
  - default rule は
    - defaultSG からの inbound は全て許可するよ(逆に言うと、defaultSG 以外からの inbound は全て拒否されているよ)
    - outbound は全て許可するよ
  - defaultSG は削除できないよ
    - 削除できちゃうと、その VPC で作った ec2 インスタンス作成時に SG を指定しなかった場合何を attach していいかわからなくなるしね
- custom SG 作ってインスタンス作るときにそいつ指定すれば、defaultSG じゃなくて指定した方が attach されるよ
- customSG は VPC ごとに作れるよ VPC 間で SG の共有はできないよ

# S3

## アクセス制御

- ACL
  - AWS account 単位で bucket, object へのアクセス権限を定義できるよ
- bucket policy
  - bucket, object への resource-based policy だよ
- IAM policy

の 3 つ

## PublicAccessBlock 設定

Public(全世界公開)な ACL, bucket policy が適用されないように block する仕組みを提供してくれる設定
AWS Account(つまりその Account が所有する bucket すべて)もしくは個別の bucket に対して設定可能

- block_public_acls
  - public な ACL が新規作成されるのを防ぐ
- block_public_policy
  - public な bucket policy が新規作成されるのを防ぐ
- ignore_public_acls
  - public な ACL が無視される
- restrict_public_buckets
  - public な bucket policy or ACL が適用されたとしても、認証なしにはアクセスできない(?)

# CloudWatch

- AWS リソースの各種 metrics を収集してくれるよ
  - CloudWatch は基本的には metrics の repository だよ
  - EC2 とかの AWS サービスが metrics を repository に送信する、push 型 architecture だよ
  - S3 とか Lambda は何も設定しなくても勝手に metrics 送信してくれるけど、ec2 とかは統合 CloudWatch agent を install しないといけないよ
    - CloudWatchLog agent とかいうのは古いバージョンの agent の名前だよ
- Dashboard には収集した metrics をグラフ化して表示できるよ
- metrics を元に Alarm も設定できるお
  - SNS と連携して、Alarm を slack とかに飛ばすこともできるよ
  - ASG と連携して、alarm がなったら instance 台数増やすみたいなこともできるよ
- namespace によって metrics がグルーピングされるよ
  - AWS リソースが勝手に送信してる分は、その Service 名を元にした namespace になってるよ
  - AWS/EC2 みたいなね

# CloudWatchLogs

- ec2, s3, cloudtrail とかの AWS リソースから送られる log をためておけるよ
  - こっちも metrics と同じく、s3 とかは設定なしでいいけど ec2 とかは統合 CloudWatch agent を install する必要があるよ
- ためておいた log は検索したり、解析したりできるよ
- log の内容を元に alarm を作成したりできるよ
- log event = リソースが送ってくる log レコード 1 つ 1 つのことだよ
  - ロギング日時とログメッセージ内容のセットで構成されてるよ
- log stream = log event を発生させる source と 1:1 で結びつく stream だよ
- log group = log stream をまとめるためのグループだよ
  - web サーバーを複数台で運用してる場合とかは log stream がばらけるので、log group でまとめたりするよ
- metric filter = log event の message から metrics を抽出し、そいつを CloudWatchMetrics に変換するやつだよ
  - log group に対して設定できて、設定した metric filter は log group 内の全 log stream に適用されるよ

# Elastic Load Balancing

- Application Load Balancer, Classic Load Balancer など複数種類があるよ

## Application Load Balancer

- load balancer は最低 2AZ に配置されるようにしないといけないよ
  - 作成するとき、最低 2AZ に配置されるように配置 subnet を指定してね
- public subnet に ALB をおいて、そいつにぶら下げる ec2 は private(protected が多いけど)subnet におくのが普通だよ

## aws CLI

- v2 が最新だよ
- 最低限の configure は aws configure コマンドでやるよ
  - ACCESS_KEY, SECRET_ACCESS_KEY, region, output_format を configure として保持するよ
    - AWS の API 叩くには署名つきリクエストしないといけなくて、署名には ACCESS_KEY, SECRET_ACCESS_KEY が必要なんだよ
    - CLI では裏側で勝手に署名してくれるよ
  - configure を local に複数保持することもできて、1 つ 1 つを profile ってよんでるよ
  - aws configure --profile で指定すれば任意の名前の profile に保存できるけど、指定しなかったら"default"って名前の profile に保存されるよ

# ElasticsearchService

- 本番環境とかでは、専用 master node を用意し、かつ MultiAZ 構成にすることが多いよ
  - AZ は 2 つか 3 つを指定できるよ
- MultiAZ にする目的は耐久性と可用性の向上だよ
  - つまり、複数の AZ に primary shard とその replica がまたがって配置されてないと意味ないよ
  - ということで、data node の数は AZ の数以上、replica shard の数は 1 以上を守ってね
