import React from "react"
import {createRoot} from "react-dom/client"
import OptionsApp from "./react/OptionsApp.jsx"

const reactRoot = createRoot(document.getElementById("react-root"))
reactRoot.render(
    <OptionsApp />
)