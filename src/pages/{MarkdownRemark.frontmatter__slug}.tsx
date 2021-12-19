import { graphql, PageProps } from "gatsby"
import * as React from "react"
import "twin.macro"
import Layout from "../components/Layout"
import MarkdownContent from "../components/MarkdownContent"
import Seo from "../components/Seo"

const ShowPage: React.VFC<PageProps<GatsbyTypes.BlogShowQuery>> = ({
  data,
}) => {
  const { markdownRemark } = data
  return (
    <Layout>
      <Seo title={markdownRemark?.frontmatter?.title ?? ""} />
      <article tw="py-2.5">
        <h1 tw="text-3xl font-bold">{markdownRemark?.frontmatter?.title}</h1>
        <div tw="flex flex-row-reverse mb-2">
          <time
            dateTime={markdownRemark?.frontmatter?.date}
            tw="font-light text-sm"
          >
            {markdownRemark?.frontmatter?.date}
          </time>
        </div>
        <MarkdownContent>
          <div
            dangerouslySetInnerHTML={{ __html: markdownRemark?.html || "" }}
            tw="prose prose-sm md:prose max-w-full"
          />
        </MarkdownContent>
      </article>
    </Layout>
  )
}

export const query = graphql`
  query BlogShow($id: String!) {
    markdownRemark(id: { eq: $id }) {
      html
      frontmatter {
        title
        date
        slug
      }
    }
  }
`

export default ShowPage
