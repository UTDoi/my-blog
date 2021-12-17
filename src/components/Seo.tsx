import { graphql, useStaticQuery } from "gatsby"
import * as React from "react"
import { Helmet } from "react-helmet"

type Props = {
  title: string
  description?: string
  meta?: Array<{ name: string; content: string }>
}

const Seo: React.VFC<Props> = ({ title, description, meta }) => {
  const { site } = useStaticQuery<GatsbyTypes.SeoQuery>(
    graphql`
      query Seo {
        site {
          siteMetadata {
            title
            description
            author
          }
        }
      }
    `
  )

  const defaultTitle = site?.siteMetadata?.title
  const metaDescription = description || site?.siteMetadata?.description

  return (
    <Helmet
      htmlAttributes={{
        lang: "ja",
      }}
      title={title}
      titleTemplate={defaultTitle ? `%s | ${defaultTitle}` : `%s`}
      meta={[
        {
          name: `description`,
          content: metaDescription,
        },
        {
          property: `og:title`,
          content: title,
        },
        {
          property: `og:description`,
          content: metaDescription,
        },
        {
          property: `og:type`,
          content: `website`,
        },
        {
          name: `twitter:card`,
          content: `summary`,
        },
        {
          name: `twitter:creator`,
          content: site?.siteMetadata?.author || ``,
        },
        {
          name: `twitter:title`,
          content: title,
        },
        {
          name: `twitter:description`,
          content: metaDescription,
        },
      ].concat(meta || [])}
    />
  )
}

export default Seo
