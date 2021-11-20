/**
 * Layout component that queries for data
 * with Gatsby's useStaticQuery component
 *
 * See: https://www.gatsbyjs.com/docs/use-static-query/
 */

import { graphql, useStaticQuery } from "gatsby"
import * as React from "react"
import "twin.macro"
import { GlobalStyles } from "twin.macro"
import Footer from "./footer"
import Header from "./header"

type Props = {
  children: React.ReactNode
}

const Layout: React.VFC<Props> = ({ children }) => {
  const data = useStaticQuery<GatsbyTypes.SiteTitleQueryQuery>(graphql`
    query SiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  return (
    <>
      <GlobalStyles />
      <Header siteTitle={data?.site?.siteMetadata?.title || "Title"} />
      <main tw="container mx-auto text-center">{children}</main>
      <Footer />
    </>
  )
}

export default Layout