---
published: true
date: "2022-06-12"
title: "python(boto3) で lambda function url (認証あり)を叩いてみる"
slug: "/blog/about-ssh"
---

Lambda の [function url](https://docs.aws.amazon.com/lambda/latest/dg/lambda-urls.html) という機能を使うと、関数独自の url を公開し、そこへの HTTP リクエスト経由で関数を実行することができるようになる。
公開時のオプションとしてIAM認証のあり/なしを選択することができ、認証ありにした場合は client の role もしくは user に適切な policy(lambda:InvokeFunctionUrl の実行権限) を付与した上で、SigV4署名付きリクエストを送るようにしないといけない。

function url に署名付きリクエストを送るサンプルコードとして、python で boto3 を使用したものがあまりweb上に落ちてなかったのでここにメモがてら残しておく。

```
import boto3
from botocore.awsrequest import AWSRequest
from botocore.auth import SigV4Auth

url = 'https://your-lambda-function-url.lambda-url.ap-northeast-1.on.aws'
payload = {'hoge': 'hoge'}
credentials = boto3.Session().get_credentials()
awsreq = AWSRequest(method="GET", url=url, params=payload)
SigV4Auth(credentials, "lambda", "ap-northeast-1").add_auth(awsreq)

response = requests.get(url, headers=awsreq.headers, params=payload)

if response.status_code != 200:
    raise Exception('処理実行時にエラーが発生しました。',
                    f'[status_code: {response.status_code}, text: {response.text}')
```
