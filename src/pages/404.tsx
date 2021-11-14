import * as React from "react"

import Layout from "../components/layout"
import Seo from "../components/seo"

const NotFoundPage: React.VFC = () => (
  <Layout>
    <Seo title="hoge" description="hoge" lang="ja" meta={[]} />
    <h1>404: Not Found</h1>
    <p>You just hit a route that doesn&#39;t exist... the sadness.</p>
  </Layout>
)

export default NotFoundPage
