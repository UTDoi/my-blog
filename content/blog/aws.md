# IAM
## User
- 認証は ID&Pass もしくは ACCESS_KEY&SECRET_KEY で行うよ
- セキュリティのため(KEYが漏洩しやすいから)Userにはほとんど権限を与えず、認証後に必要なpolicyがattachされたRoleにSwitchする運用がほとんどだよ

## Role
- roleを付与されたリソースは、stsに対してroleのarnを指定してassume roleリクエストを送ってcredentialを取得して、それを使うことでroleに付与されたpolicyの権限セットでアクセスできるよ
  - だからroleにはassume roleに関するpolicy(信頼policy)を設定して、assume roleを許可するprincipalを限定する必要があるよ
  - 得られるcredentialはshort-termだよ

## policy
policyはusecaseで大別すると以下の2つだよ

- Identities(user, group or role)ベースpolicy
  - user, group, roleにattachするよ
  - attachしたidentityがどんなResourceにどんなactionをできるか規定するよ
- Resourceベースpolicy
  - AWS Resourceに対してattachするよ
  - attachしたResourceに対して、どのPrincipalがどんなactionをできるか規定するよ
  - policyをattachできるAWSリソースは決まってて、S3とかElasticsearchServiceとかはできるよ
  - S3のbucket policyとかが有名だよ
- 信頼policy(assume role policy)
  - roleにattachするよ
  - attachしたroleに対するAssumeRoleリクエストをstsが許可するPrincipalを規定するよ

ResourceベースpolicyがatttachされたResourceに、Identitiesベースpolicyがattachされたindentityからアクセスする場合は、
双方のpolicyは
```
明示的な拒否(Deny) > 明示的な許可(Allow) > 暗黙的な拒否(未設定、デフォルト)
```
の順に優先されて評価されるよ


# Lambda
## execution role
- Lambda function がinvokeされるときにassumeするroleのことだよ
- 実態はiam roleだよ
- defaultだとCloudWatchへのアクセス(?)のみが許可されたminimalなpolicyがattachされたroleが暗黙的に作られ、assumeされるよ

## concurrency
- Lambdaはrequestを受けるごとに新しく実行インスタンスを起動してリクエストを受けるよ
  - この、起動された台数=時間あたりにいくらリクエストを捌けるかをconcurrencyと呼んでるよ
  - Burst limitを超える台数起動されちゃうと、そっから先は500台/minごとしか起動できなくなっちゃうよ
    - tokyo regionでは1000がburst limitだよ
  - burst limit 超えて、concurrency limitまで行っちゃうとそっから先は増やせなくなっちゃうよ
    - concurrency limitはデフォで1000だけど、AWSに頼めば増やしてもらえるよ
  - 起動する際にコードの読み込みや初期化が必要だから、結構時間かかっちゃうよ=コールドスタートって呼ぶよ
    - そのため、事前にセットアップを済ませた(ウォームスタートって呼ぶよ)実行インスタンスを何台か用意しておけるよ
    - これをProvisioned Concurrencyっていうよ
    - あとこれ使えばリクエストがspikeしてもscale間に合わなくてthrottelingにひっかかるみたいなのなくなるよ

## Layer
artifact(npm_modulesとかvendor/bundleとかライブラリが主)を共有しておける機能だよ
Lambdaからアクセスできる共有ストレージみたいなイメージだね

## ConnectToVPC
- LambdaはAWS管理のネットワーク上に配置されているよ
- なので、ユーザが作ったVPCのprivate subnet内にあるリソースへのアクセスは基本無理だよ
  - とはいえ、private subnetをpublic subnetにするのも嫌だよ
- そこで、ENI経由でLambdaからprivate subnetにアクセスする仕組みがあるよ
- Lambda function invoke時に都度ENIを作成し、そのENIを対象のprivate subnetに所属させ、そいつ経由でLambdaがprivate subnet内のリソースにアクセスするよ
  - ENIにはSGも設定できるよ
  - 現在ではENIは都度作成せず、最初に作ったものを使いまわしてるよ
    - LambdaからENIにつなぐときにNAT通してるから使いまわせるんだよ
- この仕組みを一般にVPC内Lambdaって言ってるよ
  - 実際にはLambdaの実行インスタンス自体はVPC内にいないけどね
  - 実際にいるのはENIだよ

## metrics
- functionがexecuteされるたびに、CloudWatchにmetricsを送ってるよ
  - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
  - Invocationsはfunctionが実行された数で、successもerrorも含むけど、throttleとかでexecute自体が行われなかった時はcountされないよ

## logs
- function実行時に出力されるlogは、勝手にCloudWatchLogsに送信されるよ
  - LogGroupは勝手に作られるよ
  - execution roleに、CloudWatchLogsへのアクセスpolicyをattachしとく必要はあるから注意してね
- 事前に CloudWatchLogGroupを作成しとくと、そいつに対してlogが送信されるよ
  -  `/aws/lambda/<function name>.`って名前のLogGroupにしとけばOKだよ

## datadog lambda layer
datadogではlambdaからメトリクス送るためライブラリをlamnda layerの形で提供しているよ
`arn:aws:lambda:<AWS_リージョン>:464622532012:layer:Datadog-<ランタイム>:<バージョン>`って感じでarn指定するととってこれるよ

中身は各ランタイム向けのpackageだよ
node.jsの場合 datadog-lambda-js ってnpm packageだね

# VPC
- 仮想ネットワークだよ
  - 各VPCは独立したネットワークになってるよ
- 作成するときにCIDRブロックを指定して、IPアドレスの範囲を決めるよ(ほとんどのばあいsubnetmaskは16でやるよ)
- VPCは全AZに跨って作成されるよ
  - 1AZに対して複数のsubnetを作成できるよ(逆に言うと、subnetはAZを跨げないよ)
  - subnetにもCIDERを指定してアドレス範囲を決めるよ(だいたい/24だよ)
- アカウント作成時に勝手に各RegionにdefaultVPCが作られてるよ
  - ec2やELB, RDSとかは作成時にVPCを指定しなければdefaultVPCの中に作られるよ

## subnet
- 各subnetは1つのroute tableと紐付けられるよ
  - route tableは、subnet外に出るoutbound trafficの行先を、Destination IPを元にroutingするやつだよ
  - subnet作成時に何も指定しなければ、所属VPCのmain route tableが勝手に紐付けられるよ
  - main Route Tableの中身は変更することもできるよ
- InternetGWを持ち、route tableでdefaultGW(0.0.0.0/0, つまりoutbound trafficに対するrouting先)としてInternetGWが指定されていて、中のインスタンスがpublic IPを持つように設定されたものをpublic subnetというよ
  - つまりインターネットへの通信もできるし、インターネットからの通信も返せるってことだよ
  - 中に配置するec2にはElasticIPを割り当てて、インターネットから安定して(defaultのpublic IPだと毎回かわっちゃう)通信できるようにすることが多いよ
- InternetGWを持たないものをprivate subnetというよ
  - インターネットとの通信は一切できないよ
- InternetGWは持たないが、NATインスタンスをもちdefaultGWとしてNATを指定してるものをprotected subnetというよ
  - internetへのoutbound trafficのみOKだよ
  - package の取得などでインスタンスからinternetへのアクセスは行いたいがInternetからのアクセスは許したくない場合にこれが作られるyo

## NetworkACL
- subnetごとに設定できるfirewallだよ
- SGのruleと似てるけどAllowもDenyも指定できるよ
- SGと違ってStatelessなので、戻りの通信も考慮してAllowやDenyをしなきゃいけないよ

## Internet Gateway
- Internetとの通信に使うcomponentで、高いscalabilityと耐久性、可用性をもつよ
- 以下の手順でInternet通信が可能になるよ
  - Internet GatewayをVPCにattach
  - subnetにroute tableを設定し、インターネットアクセスを許可したいDestination(全部なら0.0.0.0/0, 特定のサイトだけならそいつのIP)に対しInternet Gatewayへのroutingを設定する
  - Internet通信したいインスタンスにPublic IPを設定する
  - Internet通信したいインスタンスのSG,所属subnetのNetworkACLで、対象通信先に穴あけ
- Internet Gatewayは1to1NATの役割をはたすよ
  - privateIPとpublicIPのmappingをしてくれることによって、Internetとの通信が可能になるよ

## NAT device
- public subnetからInternetへの通信を行いたい時は、NAT deviceを通じて行えるよ
  - privateIPと送信元portの組み合わせを記憶して、実際の通信先にはNATに割り当てられたpublicIPでアクセス、responseのヘッダに含まれてるportからprivateIPへの変換を行い、trafficを通信元に届けるよ
- NAT deviceにはmanagedなNATGatewayと、unmanagedでec2インスタンス上に作成するNATInstanceの二種類があるよ
  - 何か理由がない限りmanagedなNATGatewayを使った方がいいよ

### NAT Gateway
- public subnetにNAT Gatewayを配置して、ElasticIPを割り当てないとダメだよ
  - そうしないと外部と通信できないからね
  - つまり instance -> NAT Gateway -> InternetGatewayのようにroutingされていくわけだね
  - subnetに配置することなんで、1AZに配置されることになるから可用性高めたい時は複数AZ(subnet)に1つずつ配置するようにした方がいいよ
- NAT Gatewayを通したいprivate subnetのroute tableのdefault gatewayにNAT Gatewayのidを指定してあげれば準備OKだよ

### RouteTable
- subnetもしくはgatewayからのoutbound trafficをどこにroutingするか決めるためのrule setだよ
- 作成したVPCには、勝手にmain route tableが作成されて紐付けられるよ
  - 全てのsubnetは、custom route tableを指定しなかった時このmain route tableが適用されるよ
- Destinationで通信元の指定した通信先IPを定義し、それに対応するTargetでrouteing先のgatewayのidなどを指定するよ

### VPC endpoint
- ユーザーVPC外のAWSリソース(S3)とかに、インターネット経由しなくてもVPC内からアクセスできる機能だよ
  - AWS PrivateLinkを利用されているよ
  - Interface endpoints, Gateway Load Balancer endpoints, Gateway endpointsの3つがあるよ

#### Interface endpoints
- 今はこっちが主流で、ほとんどのserviceが対応しているよ
- 指定したsubnet内にendpointにつながったENIが立ち上がるよ
  - もちろんそいつにはprivate IPが与えられるので、VPC内で通信ができるって感じだよ

#### Gateway endpoints
- S3とdynamoDBしか対応してないよ
- GateWayをVPCにattachして、route tableでservice endpointのDestinationに対してVPC endpoint GWをroutingするって感じだよ
  - service endpointはpublic IPに名前解決されて、実際にはinstanceからはpublic IPにリクエストがいくので、NetworkACLでlocal VPC以外へのoutboundをDenyとかすると失敗しちゃうよ
  - instanceからはprivate IPでリクエストできるので多分、内部ではNAT的な動作をしてるんだろうね

# EC2
## networking
- ec2インスタンスにsubnetを指定すると、仮想NICが作られてインスタンスに付与されるよ
- 仮想NICにはsubnetからprivate IPv4アドレスが紐付けられるよ
  - インスタンスがterminateされるまでNICとIPアドレスの紐付けは維持されるよ
- private IPv4アドレスへ名前解決する内部DNS用domain名(ip-10-251-50-12.ec2.internalとか)も勝手に追加されるよ
  - この内部DNSは、同じVPC内でしか名前解決できないよ
- public IPアドレスのattachも可能だけど、defaultだとAWSで保有してるアドレスプールから割り当てられるから日々変わる可能性があるよ
  - public IPアドレスに対応するdomain名( ec2-203-0-113-25.compute-1.amazonaws.comとか)も勝手に追加されてるよ
  - public IPアドレスは、NATによってprimary private IPに勝手に紐付けられてるよ
- 固定IPが欲しいならElastic IPを利用してね(金はかかるよ)

### ENI
- AWSで使用される仮想NICだよ
- ec2インスタンスがVPCにおいてnetwork通信を行うためのインタフェースとして使われたりするよ
  - 上で書いた仮想NICのことだよ
- どのsubnetにおいて、どのSGで作成するかを指定できるよ
- ec2インスタンスはデフォルトでeth0ってENIがattachされた状態で起動されるよ
  - もちろん新しくENIを作ってインスタンスに付与することで、macアドレス, IPアドレスを1インスタンスに2以上付与することが可能だよ

## instance profile
- インスタンスに紐づけるroleを指定するコンテナだよ
- インスタンスは、ここで指定されたroleにassume roleしにいくよ

## Security Group
- ec2インスタンスの仮想firewallとして機能してくれるやつだよ
  - 例の如く、実態としてはec2じゃなくてENIに付与されてるものだから、ec2についてるENIごとにSGを変えることができるよ
- ec2への inbound/outbound traffic に対するruleを設定できるお
  - defaultではport 25からのoutboundは禁止されてるよ
    - spam mailerとして使われるのを防ぐためだよ
  - denyは指定できず、allowのみ指定できるよ
  - IPaddress(Source/Destination), protocol, port rangeの組み合わせに対してallowリストを作成できるよ
    - inbound ruleなら
      - Source: 192.168.2.11, protocol: TCP, port range: 80 みたいな感じにすると、192.168.2.11からのHTTP80番ポートアクセスを許可するよ
    - outbound ruleなら
      - Destination: 192.168.2.3, protocol: TCP, port range: 0-65555 みたいな感じにすると、192.168.2.3への0-65555(ephemeral portをふくむように)でのTCPアクセスを許可するよ
    - Source/DestinationにはIPだけじゃなくSGも指定できるよ
      - 例えば、自身のSGそのものをSourceに指定したら、同じSGに属するやつからのinbound trafficを許可する感じになるよね
- Statefulだよ
  - つまり、allowされたinbound traffic(=SG外からのrequest)に対するoutbound traffic(SG外へのresponse)は、outbound ruleに関係なく許可されるよ
  - allowされたoutbound traffic(=SG外へのrequest)に対するinbound traffic(SG外へのresponse)も、inbound ruleに関係なく許可できるよ
  - Statefulなわけだから
    - Ingress => どいつからのどのポートへのアクセス(こっちへのrequest)を許可するか
    - Egress => どいつへのどのポートでのアクセス(こっちからのrequest)を許可するか
  - って感じにrequestだけをシンプルに考えられるよ
- defaultVPCにはdefaultSecurityGroupが勝手に作られてて、何も指定せずec2インスタンス作るとそいつがattachされるよ
  - default ruleは
    - defaultSGからのinboundは全て許可するよ(逆に言うと、defaultSG以外からのinboundは全て拒否されているよ)
    - outboundは全て許可するよ
  - defaultSGは削除できないよ
    - 削除できちゃうと、そのVPCで作ったec2インスタンス作成時にSGを指定しなかった場合何をattachしていいかわからなくなるしね
- custom SG作ってインスタンス作るときにそいつ指定すれば、defaultSGじゃなくて指定した方がattachされるよ
- customSGはVPCごとに作れるよ VPC間でSGの共有はできないよ

# S3
## アクセス制御
- ACL
  - AWS account単位でbucket, objectへのアクセス権限を定義できるよ
- bucket policy
  - bucket, objectへのresource-based policyだよ
- IAM policy

の3つ


## PublicAccessBlock設定
Public(全世界公開)な ACL, bucket policy が適用されないように block する仕組みを提供してくれる設定
AWS Account(つまりそのAccountが所有するbucketすべて)もしくは個別のbucketに対して設定可能

- block_public_acls
  - publicなACLが新規作成されるのを防ぐ
- block_public_policy
  - publicなbucket policyが新規作成されるのを防ぐ
- ignore_public_acls
  - publicなACLが無視される
- restrict_public_buckets
  - publicなbucket policy or ACLが適用されたとしても、認証なしにはアクセスできない(?)

# CloudWatch
- AWSリソースの各種metricsを収集してくれるよ
  - CloudWatchは基本的にはmetricsのrepositoryだよ
  - EC2とかのAWSサービスがmetricsをrepositoryに送信する、push型architectureだよ
  - S3とかLambdaは何も設定しなくても勝手にmetrics送信してくれるけど、ec2とかは統合CloudWatch agentをinstallしないといけないよ
    - CloudWatchLog agentとかいうのは古いバージョンのagentの名前だよ
- Dashboardには収集したmetricsをグラフ化して表示できるよ
- metricsを元にAlarmも設定できるお
  - SNSと連携して、Alarmをslackとかに飛ばすこともできるよ
  - ASGと連携して、alarmがなったらinstance台数増やすみたいなこともできるよ
- namespaceによってmetricsがグルーピングされるよ
  - AWSリソースが勝手に送信してる分は、そのService名を元にしたnamespaceになってるよ
  - AWS/EC2 みたいなね

# CloudWatchLogs
- ec2, s3, cloudtrailとかのAWSリソースから送られるlogをためておけるよ
  - こっちもmetricsと同じく、s3とかは設定なしでいいけどec2とかは統合CloudWatch agentをinstallする必要があるよ
- ためておいたlogは検索したり、解析したりできるよ
- logの内容を元にalarmを作成したりできるよ
- log event = リソースが送ってくるlogレコード1つ1つのことだよ
  - ロギング日時とログメッセージ内容のセットで構成されてるよ
- log stream = log eventを発生させるsourceと1:1で結びつくstreamだよ
- log group = log streamをまとめるためのグループだよ
  - webサーバーを複数台で運用してる場合とかはlog streamがばらけるので、log groupでまとめたりするよ
- metric filter = log eventのmessageからmetricsを抽出し、そいつをCloudWatchMetricsに変換するやつだよ
  - log groupに対して設定できて、設定したmetric filterはlog group内の全log streamに適用されるよ

# Elastic Load Balancing
- Application Load Balancer, Classic Load Balancerなど複数種類があるよ

## Application Load Balancer
- load balancerは最低2AZに配置されるようにしないといけないよ
  - 作成するとき、最低2AZに配置されるように配置subnetを指定してね
- public subnetにALBをおいて、そいつにぶら下げるec2はprivate(protectedが多いけど)subnetにおくのが普通だよ

## aws CLI
- v2が最新だよ
- 最低限のconfigureはaws configureコマンドでやるよ
  - ACCESS_KEY, SECRET_ACCESS_KEY, region, output_formatをconfigureとして保持するよ
    - AWSのAPI叩くには署名つきリクエストしないといけなくて、署名にはACCESS_KEY, SECRET_ACCESS_KEYが必要なんだよ
    - CLIでは裏側で勝手に署名してくれるよ
  - configureをlocalに複数保持することもできて、1つ1つをprofileってよんでるよ
  - aws configure --profileで指定すれば任意の名前のprofileに保存できるけど、指定しなかったら"default"って名前のprofileに保存されるよ

# ElasticsearchService
- 本番環境とかでは、専用master nodeを用意し、かつMultiAZ構成にすることが多いよ
  - AZは2つか3つを指定できるよ
- MultiAZにする目的は耐久性と可用性の向上だよ
  - つまり、複数のAZにprimary shardとその replica がまたがって配置されてないと意味ないよ
  - ということで、data nodeの数はAZの数以上、replica shardの数は1以上を守ってね
