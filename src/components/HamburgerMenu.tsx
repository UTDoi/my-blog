import * as React from "react"
import { slide as Menu } from "react-burger-menu"
import tw, { styled } from "twin.macro"

type Props = {
  children: React.ReactNode
}

const StyledMenu = styled.div`
  /* Position and sizing of burger button */
  .bm-burger-button {
    ${tw`fixed w-9 h-8 right-3 top-3`}
  }

  /* Color/shape of burger icon bars */
  .bm-burger-bars {
    ${tw`bg-white`}
  }

  /* Color/shape of burger icon bars on hover*/
  .bm-burger-bars-hover {
    ${tw`bg-white`}
  }

  /* Position and sizing of clickable cross button */
  .bm-cross-button {
    ${tw`h-6 w-6`}
  }

  /* Color/shape of close button cross */
  .bm-cross {
    ${tw`bg-white`}
  }

  /*
  Sidebar wrapper styles
  Note: Beware of modifying this element as it can break the animations - you should not need to touch it in most cases
  */
  .bm-menu-wrap {
    ${tw`fixed h-full`}
  }

  /* General sidebar styles */
  .bm-menu {
    background: #373a47;
    ${tw`pt-8 px-6 pb-0 text-xl leading-8 tracking-widest`}
  }

  /* Morph shape necessary with bubble or elastic */
  .bm-morph-shape {
    fill: #373a47;
  }

  /* Wrapper for item list */
  .bm-item-list {
    ${tw`text-white p-4`}
  }

  /* Individual item */
  .bm-item {
    ${tw`inline-block`}
  }

  /* Styling of overlay */
  .bm-overlay {
    background: rgba(0, 0, 0, 0.3);
  }
`

const HamburgerMenu: React.VFC<Props> = ({ children }) => (
  <StyledMenu>
    <Menu right width="40%">
      {children}
    </Menu>
  </StyledMenu>
)

export default HamburgerMenu
