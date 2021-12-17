import { Link } from "gatsby"
import * as React from "react"
import "twin.macro"
import Layout from "../components/Layout"
import Seo from "../components/Seo"

const NotFoundPage: React.VFC = () => (
  <Layout>
    <Seo title="Not Found" />
    <div tw="mt-10 text-center">
      <h1 tw="text-3xl font-bold p-3">404 Not Found</h1>
      <Link to="/">
        <span tw="border-b-black border-b">トップページへ</span>
      </Link>
    </div>
  </Layout>
)

export default NotFoundPage
