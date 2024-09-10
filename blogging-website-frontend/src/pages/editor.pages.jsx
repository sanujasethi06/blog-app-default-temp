import React, { useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { UserContext } from '../App'
import Editor from '../components/blog-editor.component'
import PublishForm from '../components/publish-form.component'

const EditorPage = () => {
    const [editorState,setEditorState]=useState("editor")
    const {userAuth :{access_token}} = useContext(UserContext)
  return (
    access_token===null? <Navigate to={"/signin"}/>
    : editorState == "editor" ? <Editor/>: <PublishForm/>
  )
}

export default EditorPage