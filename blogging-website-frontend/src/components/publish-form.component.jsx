import React, { useContext } from 'react'
import toast, { Toaster } from 'react-hot-toast'
import AnimationWrapper from '../common/page-animation'
import { EditorContext } from '../pages/editor.pages'
import Tag from './tags.component'

const PublishForm = () => {
  let characterLimit=200;
  let tagLimit=10;
  let {blog,blog:{banner,title,tags,desc},setEditorState,setBlog}=useContext(EditorContext)
  const handleCloseEvent=()=>{
    setEditorState("editor")
  }

  const handleBlogTitleChange=(e)=>{
    let input =e.target;
    setBlog({...blog,title: input.value})

  }
  const handleBlogDescChange=(e)=>{
    let input = e.target;
    setBlog({...blog, desc:input.value})
  }
  const handleTitleKeyDown=(e)=>{
    console.log(e)
    if(e.keyCode==13){
        e.preventDefault();
    }
}
const handleKeyDown=(e)=>{
  if(e.keyCode==13|| e.keyCode==188){
    e.preventDefault();
    let tag = e.target.value;
    if(tags.length<tagLimit){
      if(!tags.includes(tag) && tag.length){
          setBlog({...blog,tags:[...tags,tag]})
      }

    }else(
      toast.error(`You can add max ${tagLimit} tags`)
    )
    e.target.value="";
  }
}
  return (
    <AnimationWrapper>
   <section className='w-screen min-h-screen grid item-center lg:grid-cols-2 py-16 lg:gap-4'>
      <Toaster/>
      <button className='w-12 h-12 absolute right-[5vw] z-10 top-[5%] lg:top-[10%]' onClick={handleCloseEvent}>
        <i className="fi fi-br-cross"></i>
      </button>
      <div className='max-w-[550px] center'>
        <p className="text-dark-grey mb-1">Preview </p>
          <div className="w-full aspect-video rounded-lg overflow-hidden bg-grey mt-4">
            <img src={banner} alt="" />
          </div>
          <h1 className='text-4xl font-medium mt-2 leading-tight line-clamp-2'>{title}</h1>
          <p className="font-gelasio line-clamp-2 text-xl leading-7 mt-4">{desc}</p>
       
      </div>
      <div className='border-grey lg:border-1 lg:pl-8'>
        <p className="text-dark-grey mb-2
        mt-9">Blog Title</p>
        <input type="text" className="input-box pl-4" placeholder='Blog Title'defaultValue={title} onChange={handleBlogTitleChange}/>
        <p className="text-dark-grey mb-5 mt-9">Short description about your blog</p>

        <textarea maxLength={characterLimit} defaultValue={desc} className='h-40 resize leading-7 input-box pl-4' onChange={handleBlogDescChange} onKeyDown={handleTitleKeyDown}></textarea>
        <p className='mt-1 text-dark-grey text-sm text-right'>{characterLimit-desc.length} character left</p>
        <p className="text-dark-grey mb-2 mt-9">Topics - (Helps is searching and ranking your blog post)</p>
        <div className="relative input-box pl-2 py-4">
          <input type="text" className="sticky input-box bg-white top-0 left-0 pl-4 mb-3 focus:bg-white" placeholder='Topic' onKeyDown={handleKeyDown}/>
       
       {
        tags.map((tag,i)=>{
          return <Tag tag={tag} key={i}/>
        })
       }
        
        </div>
        <p className="mt-1 mb-4 text-dark-grey text-right">{tagLimit - tags.length} Tags left</p>
        <button className="btn-dark px-8">Publish</button>
      </div>
   </section>
    </AnimationWrapper>
  )
}

export default PublishForm