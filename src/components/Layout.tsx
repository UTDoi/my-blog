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
import Footer from "./Footer"
import Header from "./Header"

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
      <div tw="bg-gray-300 text-black font-roboto flex flex-col min-h-screen">
        <Header siteTitle={data?.site?.siteMetadata?.title || "Title"} />
        <main tw="container mx-auto text-center flex-grow">{children}</main>
        <Footer />
      </div>
    </>
  )
}

export default Layout
