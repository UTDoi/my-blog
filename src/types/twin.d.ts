import { css as cssImport } from "@emotion/react"
import styledImport from "@emotion/styled"
import "twin.macro"

declare module "twin.macro" {
  const styled: typeof styledImport
  const css: typeof cssImport
}
