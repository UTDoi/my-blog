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
  const data = useStaticQuery<GatsbyTypes.SiteTitleQuery>(graphql`
    query SiteTitle {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)

  const hamburgerMenuOuterContainerId = "outer-container"
  const hamburgerMenuPageWrapId = "page-wrap"

  return (
    <>
      <GlobalStyles />
      <div
        id={hamburgerMenuOuterContainerId}
        tw="text-black font-roboto flex flex-col min-h-screen"
      >
        <Header
          siteTitle={data?.site?.siteMetadata?.title || "Title"}
          hamburgerMenuOuterContainerId={hamburgerMenuOuterContainerId}
          hamburgerMenuPageWrapId={hamburgerMenuPageWrapId}
        />
        <main id={hamburgerMenuPageWrapId} tw="container flex-grow mb-6">
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}

export default Layout
