import { Link } from "gatsby"
import * as React from "react"
import "twin.macro"
import HamburgerMenu from "./HamburgerMenu"

type Props = {
  siteTitle: string
  hamburgerMenuOuterContainerId: string
  hamburgerMenuPageWrapId: string
}

const Header: React.VFC<Props> = ({
  siteTitle,
  hamburgerMenuOuterContainerId,
  hamburgerMenuPageWrapId,
}) => (
  <>
    <header tw="text-white bg-black bg-opacity-60 sticky top-0 z-10">
      <div tw="text-2xl tracking-widest p-3 antialiased">
        <Link to="/">{siteTitle}</Link>
      </div>
    </header>
    <HamburgerMenu
      outerContainerId={hamburgerMenuOuterContainerId}
      pageWrapId={hamburgerMenuPageWrapId}
    >
      <Link to="/">TOP</Link>
      <Link to="/about">ABOUT</Link>
    </HamburgerMenu>
  </>
)

export default Header
