import React, { createContext, useContext, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { UserContext } from '../App'
import Editor from '../components/blog-editor.component'
import PublishForm from '../components/publish-form.component'

const blogStructure={
  title:'',
  banner:'',
  content:[],
  tags:[],
  desc:'',
  author:{personal_info:{}}
}

export const EditorContext = createContext({ });


const EditorPage = () => {
  const [blog,setBlog]=useState(blogStructure)
    const [editorState,setEditorState]=useState("editor");
    const [textEditor,setTextEditor]=useState({isReady:false});

    const {userAuth :{access_token}} = useContext(UserContext)
  return (
    <EditorContext.Provider value={{blog,setBlog,editorState,setEditorState,textEditor,setTextEditor}}>
        {
      access_token===null? <Navigate to={"/signin"}/>
      : editorState == "editor" ? <Editor/>: <PublishForm/>
        }
    </EditorContext.Provider>
  )
}

export default EditorPage