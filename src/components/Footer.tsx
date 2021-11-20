import * as React from "react"
import "twin.macro"

const Footer: React.VFC = () => (
  <footer tw="text-sm text-white text-center antialiased bg-black opacity-60 pt-3 px-2 pb-1">
    © {new Date().getFullYear()} UTDoi All Rights Reserved.
  </footer>
)

export default Footer
