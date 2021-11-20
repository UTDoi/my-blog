import { Link } from "gatsby"
import * as React from "react"
import "twin.macro"

type Props = {
  siteTitle: string
}

const Header: React.VFC<Props> = ({ siteTitle }) => (
  <header tw="text-white bg-black opacity-60 sticky top-0">
    <h1 tw="text-2xl tracking-widest p-3 antialiased">
      <Link to="/">{siteTitle}</Link>
    </h1>
  </header>
)

export default Header
