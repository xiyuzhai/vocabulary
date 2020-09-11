import React, {useState, useRef} from 'react'
import './header.scss'
import Tooltip from '../tooltip/tooltip'
import Icon from '../icon'
import Tags from '../tags/tags'
import * as T from '../../types'
import {parseWordPieces} from '../../parser/parser'
import { isNull } from 'util'


type Props = {addWord: AddWord}

type AddWord = (w: T.WordInfo)=>Promise<void>

export default ({addWord}: Props) => {
    return(
        <div className="header">
            <Buttons addWord={addWord}/>
            <Filter/>
        </div>
    )
}

const Buttons = ({addWord}: {addWord: AddWord}) =>{
    return(
        <div className="header-buttons">
            <Tooltip>
                <div className="add"><Icon icon="plus"/></div>
                <NewWord addWord={addWord}/>
            </Tooltip>
        </div>
    )
}

const NewWord = ({addWord}: {addWord: AddWord}) => {
    const [rtags, setRtags] = useState([] as string[])
    const descRef = useRef() as React.MutableRefObject<HTMLTextAreaElement>
    const contRef = useRef() as React.MutableRefObject<HTMLInputElement>
    const delTag = (i:number) =>{
        setRtags(rtags.filter((_, j)=>j!==i))
    }
    const addTag = (tag: T.Tag)=>{
        setRtags([...rtags, tag.name])
    }
    const parenShortcut = (e: React.KeyboardEvent) =>{
        if (e.keyCode===27){
            const idx = contRef.current.selectionStart
            if (!isNull(idx)){
                const text = contRef.current.value
                contRef.current.value=text.slice(0, idx) + "()" + text.slice(idx)
                contRef.current.selectionStart = idx + 1
                contRef.current.selectionEnd = idx + 1
            }
        }
    }
    const create = () => {
        const content = parseWordPieces(contRef.current.value)
        const description = descRef.current.value
        addWord({content, description, tags: rtags})
        .then(()=>{contRef.current.value=""; descRef.current.value=""})
    }
    return(
        <div className="newword-form">
            <Tags 
                tags={rtags}
                onDelete={delTag}
                onAddition={addTag}
            />

            <div className="label">Word</div>
            <input 
                onKeyDown={parenShortcut} 
                ref={contRef} 
                type="text" 
                className="word-input"
            />
            <div className="label">Definition</div>
            <textarea ref={descRef}/>
            <span className="save" onClick={create}><Icon icon="save"/></span>
        </div>
    )
}


const Filter = () => {
    return(
        <div className="header-query">
            <input type="text" spellCheck={false} placeholder="Input query..."/>
            <span className="icon"><Icon icon="search"/></span>
        </div>
    )
}


