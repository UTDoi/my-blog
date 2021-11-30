import { graphql, Link, PageProps } from "gatsby"
import * as React from "react"
import "twin.macro"
import Layout from "../components/Layout"
import Seo from "../components/Seo"

const IndexPage: React.VFC<PageProps<GatsbyTypes.BlogIndexQuery>> = ({
  data,
}) => (
  <Layout>
    <Seo title="hoge" description="hoge" lang="ja" meta={[]} />
    {data?.allMarkdownRemark?.edges?.map(edge => (
      <section key={edge.node.id} tw="py-2">
        <Link to={edge.node.frontmatter?.slug || ""}>
          <h2 tw="text-2xl font-bold pb-2">{edge.node.frontmatter?.title}</h2>
          <p tw="pb-1 tracking-normal">{edge.node.excerpt}</p>
          <time dateTime={edge.node.frontmatter?.date} tw="font-light">
            {edge.node.frontmatter?.date}
          </time>
        </Link>
      </section>
    ))}
  </Layout>
)

export const query = graphql`
  query BlogIndex {
    allMarkdownRemark(
      filter: { frontmatter: { title: { ne: "about page" } } }
    ) {
      edges {
        node {
          id
          frontmatter {
            title
            date
            slug
          }
          excerpt
        }
      }
    }
  }
`

export default IndexPage
