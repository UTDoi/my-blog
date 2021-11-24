import { graphql, PageProps } from "gatsby"
import * as React from "react"
import "twin.macro"
import Layout from "../components/Layout"
import Seo from "../components/Seo"

const ShowPage: React.VFC<PageProps<GatsbyTypes.BlogShowQuery>> = ({
  data,
}) => {
  const { markdownRemark } = data
  return (
    <Layout>
      <Seo title="hoge" description="hoge" lang="ja" meta={[]} />
      <article tw="py-2.5 px-5">
        <h1 tw="text-3xl font-bold">{markdownRemark?.frontmatter?.title}</h1>
        <div tw="flex flex-row-reverse mb-2">
          <time
            dateTime={markdownRemark?.frontmatter?.date}
            tw="font-light text-sm"
          >
            {markdownRemark?.frontmatter?.date}
          </time>
        </div>
        <div
          dangerouslySetInnerHTML={{ __html: markdownRemark?.html || "" }}
          tw="prose max-w-full"
        />
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
