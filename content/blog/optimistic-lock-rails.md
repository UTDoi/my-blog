
# railsの楽観ロック実装
仕組み:
modelにlock_versionカラムを追加
model(id=1とする)をfindしてきて、lock_version(=1とする)も含めてfrontにresponse
frontではlock_versionはいじらず、適当に中身を編集し、lock_versionも含めてrequest
request_paramsからlock_versionも含めてmodelをnewし、update
`UPDATE some_models SET some_models.name = hoge, dogs.lock_version = 2 WHERE some_models.id = 1 AND dogs.lock_version = 1` みたいなのが1queryで走る
find->updateの間に他の人が更新なり削除なりしてたら、where句にひっかからなくなりエラーになる それをStaleObjectErrorでラップしてるだけ
