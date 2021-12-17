import * as React from "react"
import Layout from "../components/Layout"
import Seo from "../components/Seo"

const NotFoundPage: React.VFC = () => (
  <Layout>
    <Seo title="Not Found" />
    <h1>404: Not Found</h1>
    <p>You just hit a route that doesn&#39;t exist... the sadness.</p>
  </Layout>
)

export default NotFoundPage
