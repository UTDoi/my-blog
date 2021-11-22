import { Link } from "gatsby"
import * as React from "react"
import "twin.macro"
import HamburgerMenu from "./HamburgerMenu"

type Props = {
  siteTitle: string
}

const Header: React.VFC<Props> = ({ siteTitle }) => (
  <header tw="text-white bg-black bg-opacity-60 sticky top-0">
    <h1 tw="text-2xl tracking-widest p-3 antialiased">
      <Link to="/">{siteTitle}</Link>
    </h1>
    <nav>
      <HamburgerMenu>
        <Link to="/">TOP</Link>
        <Link to="/">ABOUT</Link>
      </HamburgerMenu>
    </nav>
  </header>
)

export default Header
