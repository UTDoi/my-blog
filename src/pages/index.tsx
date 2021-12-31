import { graphql, Link, PageProps } from "gatsby"
import * as React from "react"
import "twin.macro"
import Layout from "../components/Layout"
import Seo from "../components/Seo"

const IndexPage: React.VFC<PageProps<GatsbyTypes.BlogIndexQuery>> = ({
  data,
}) => (
  <Layout>
    <Seo title="Top" />
    {data?.allMarkdownRemark?.edges?.map(edge => (
      <section key={edge.node.id} tw="py-2 my-6">
        <Link to={edge.node.frontmatter?.slug || ""}>
          <h2 tw="text-2xl font-bold pb-2">{edge.node.frontmatter?.title}</h2>
          <p tw="pb-1 tracking-normal">{edge.node.excerpt}</p>
          <div tw="flex justify-between font-light text-sm">
            <time dateTime={edge.node.frontmatter?.date}>
              {edge.node.frontmatter?.date}
            </time>
            <div>{edge.node.timeToRead} min read</div>
          </div>
        </Link>
      </section>
    ))}
  </Layout>
)

export const query = graphql`
  query BlogIndex {
    allMarkdownRemark(filter: { frontmatter: { published: { eq: true } } }) {
      edges {
        node {
          id
          frontmatter {
            title
            date
            slug
          }
          excerpt(pruneLength: 50)
          timeToRead
        }
      }
    }
  }
`

export default IndexPage
