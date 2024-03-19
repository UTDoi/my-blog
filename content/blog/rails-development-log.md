---
published: true
date: "2024-03-20"
title: "rails の Started なんちゃらとかいうあのログは何者なのか、あるいはその止め方"
slug: "/blog/rails-development-log"
---

rails server を起動し適当な API にアクセスしたときに出る↓みたいなログ、こいつはいったい何者なのか調べてみたので残しておく。

```
Started GET "/" for 192.168.0.2 at 2024-03-20 18:15:45 +0900
Processing by HogeController#index as HTML
  Rendered hoge/index.html.erb within layouts/application (1.5ms)
Completed 200 OK in 79ms (Views: 60.3ms | ActiveRecord: 0.0ms)
```

まず、`Started ...`のログは https://github.com/rails/rails/blob/v6.1.7.7/railties/lib/rails/rack/logger.rb の started_request_message で出してる。

ここでは `ActiveSupport::Notifications.instrumenter` を使って start/finish の event を publish しており、それを https://github.com/rails/rails/blob/v6.1.7.7/actionpack/lib/action_controller/log_subscriber.rb やら(他にも active_record とかにも subscriber がいたりする、そいつは ar を通した SQL ログを出してる)が subscribe することで `Processing ...` とか `Completed ...` とかのログが書き出される感じになっているっぽい。

ここで、これらの logging にはデフォルトでは Rails.logger が使われる。(`ActiveRecord::Base.logger = Logger.new(/hoge.txt)` みたいにして特定のやつだけ入れ替えることは可能)  
Rails.logger は application.rb などで
```
config.logger = Logger.new('log/development.log')
```
のようにしてすげかえることもできるが、このように出力先をファイルに指定しても常に stdout にもログが書き出されるようになっている。

なぜそうなるかというと、 https://github.com/rails/rails/blob/v6.1.7.7/railties/lib/rails/commands/server/server_command.rb の log_to_stdout あたりで stdout にも broadcast されてるからである。  
daemon 起動でないかつ development 環境だとデフォルトではこの broadcast が行われるようになっている。


ログの正体が無事分かったところで、こいつを止めるにはどうすればよいか？より正確に言うと特定の API へのリクエストでログを出さないようにする、みたいなのはどうやればできるのか？  
ここまで分かっていればこれはそんなに難しくなく、下記記事にあるように Rails::Rack::Logger を継承した middleware で path を見て Rails.logger を silence してやればいい。  
https://omohikane.com/rails_disable_request_log/#google_vignette

