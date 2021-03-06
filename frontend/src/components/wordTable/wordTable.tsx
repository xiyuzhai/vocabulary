import React, {useState, useEffect, useReducer} from 'react';
import * as T from '../../types'
import Word from '../word'
import Header from './header'
import './wordTable.scss'
import * as S from '../../storage'
import * as Q from '../../query'
import WordCard from '../wordcard'
import Icon from '../icon'
import {downloadVocabulary, download} from '../../utils'
import ReactDragListView from 'react-drag-listview'

type Props = {}

function counter(n: number){
    const reducer = (s: number, q: number | undefined) => 
        q === undefined ? (s + 1) % n : q
    return reducer
}

const [CONTENT, DESCRIPT] = [1, 2]

export default ({}: Props) => {
    const [words, setWords] = useState([] as T.WordEntry[])
    const [autoplay, setAutoplay] = useState(false)
    const [mask, nextMask] = useReducer(counter(4), 0)
    const [widx, _setWIdx] = useState(null as number | null)
    const [refreshSt, refresh] = useState(false)
    const [editing, setEditing] = useState(null as number | null)
    const [vocabSize, setVocabSize] = useState(0)
    const [busy, setBusy] = useState(false)
    const [buffer, setBuffer] = useState(100)

    useEffect(()=>{S.vocabularySize().then(setVocabSize)})

    const init = () => {S.listWords().then(ws => setWords(ws))}

    useEffect(init, [])

    const setWIdx = (i: number | null) => {
        if (i === null) _setWIdx(null)
        else if (0 <= i && i < words.length) _setWIdx(i)
    }

    const addWord = (w: T.WordInfo) => {
        return S.addWord(w).then(wi => setWords([wi, ...words]))
    }

    const editWord = (i: number) => {
        const key = words[i].key
        return (w: T.WordInfo) => {
            return S.updateWord(key, ow => ({...ow, ...w}))
            .then((nw)=>{words[i].value=nw;refresh(!refreshSt)})
        }
    }

    const delWord = (i: number) => {
        return () => {
            S.delWord(words[i].key).then(() => {
                setWords(words.filter((_,j)=>i!==j))
            })
        }
    }

    const review = (i: number | null) => {
        if (i !==null && !words[i].value.reviewed) {
            const key = words[i].key
            S.reviewWord(key)
            .then((nw)=>{
                words[i]={key, value: nw}
                refresh(!refreshSt)
            })
        }
    }

    const executeQuery = (query: T.Query) => {
        // console.log(query)
        setBusy(true)
        let task: Promise<void>
        switch(query.type){
            case "Insert":
                task = Q.executeInsert(query.words).then(
                    newwords => {
                        setWords([...newwords, ...words])
                    }
                )
                break
            case "Filter":
                task = S.listWords(Q.evalExpr(query.expr) as (w: T.Word)=>boolean)
                    .then(ws => Q.execStmts(query.stmts, ws))
                    .then(setWords)
                break
            case "NewSession":
                task = S.newSession().then(init)
                break
            case "Dump":
                S.dumpDb()
                .then(s => download(new Date().toISOString()+".txt", s))
                task = new Promise((resolve)=>resolve())
                break
        }
        task.then(()=>setBusy(false))
    }

    const nextUnreviewed = () => {
        if (widx !== null){
            for(let i = widx+1; i < words.length; i ++){
                if (!words[i].value.reviewed) {
                    setWIdx(i)
                    break
                }
            }
            
        }
    }

    const prevUnreviewed = () => {
        if (widx !== null){
            for(let i = widx-1; i >= 0; i --){
                if (!words[i].value.reviewed){
                    setWIdx(i)
                    break
                }
            }
        }
    }

    const dragProps = {
        onDragEnd(fromIndex: number, toIndex: number) {
            const item = words.splice(fromIndex, 1)[0];
            words.splice(toIndex, 0, item);
            refresh(!refreshSt)
        },
        nodeSelector: 'tr',
        handleSelector: 'a'
      };
    return(
        <div className={
            (mask & CONTENT? "hide" : "") + 
            (busy? " busy" : "") + 
            (mask & DESCRIPT? " hidedef" : "")}
        >
        <div className="vocabulary">
            <Header 
                addWord={editing === null ? addWord : editWord(editing)}
                init={editing === null ? null : words[editing].value}
                cancel={()=>setEditing(null)}
                toggleHide={()=>nextMask(undefined)}
                query={executeQuery}
                export={()=>downloadVocabulary(words)}
                autoplay={autoplay}
                toggleAP={()=>setAutoplay(!autoplay)}
            />
            <div className="table_info">
                {words.length} out of {vocabSize} words selected.
            </div>
            <ReactDragListView {...dragProps}>
            <table className="word-table">
                <thead>
                    <tr>
                        <th>Word</th>
                        <th>Description</th>
                        <th>Tags</th>
                    </tr>
                </thead>
                <tbody>
                    {words.slice(0, buffer).map((w, i) => (
                        <Entry 
                            word={w} 
                            key={w.key}
                            activate={()=>{setWIdx(i)}}
                            del={delWord(i)}
                            review={()=>review(i)}
                            edit={()=>setEditing(i)}
                            idx={i}
                        />))
                    }
                </tbody>
            </table>
            </ReactDragListView>
            {buffer < words.length ? ( 
                <div className="load" onClick={()=>{setBuffer(buffer+50)}}>
                    Load More
                </div>)
                : <React.Fragment/>
            }
        </div>
        {(widx!==null)?
        <WordCard
            onClose={()=>{setWIdx(null)}}
            nextWord={()=>{setWIdx(widx+1)}}
            prevWord={()=>{setWIdx(widx-1)}}
            review={()=>review(widx)}
            word={words[widx]}
            index={{widx, length: words.length}}
            prevUnreviewed={prevUnreviewed}
            nextUnreviewed={nextUnreviewed}
            autoplay={autoplay}
        />: <></>}
        </div>
    )
}


const Entry = ({
    word, activate, del, review, edit, idx}: 
    {word: T.WordEntry, activate: ()=>void
        , del: ()=>void, review: ()=>void, edit: ()=>void
        ,idx: number
    }) => {
    const {content, tags, description} = word.value
    const reviewed = word.value.reviewed
    return(
        <tr onClick={activate} className={reviewed ? "reviewed" : ""}>
            <td>
                <a onClick={e=>e.stopPropagation()}/>
                <div className="content">{<Word ps={content}/>}</div>
            </td>
            <td><div className="description">{description}</div></td>
            <td valign="top">
                <div className="tags">
                    {tags.map((t, i)=><span key={i}>{t}</span>)}
                </div>
            </td>
            <td onClick={e=>e.stopPropagation()}>
                <Controls idx={idx} del={del} review={review} reviewed={reviewed} edit={edit}/>
            </td>
        </tr>
    )
}


const Controls = ({del, review, reviewed, edit, idx}
                : {del: ()=>void, review: ()=>void
                    , reviewed: boolean, edit: ()=>void
                    , idx: number
                }) => 
{
    return(
        <div className="controls">
            <button 
                className="edit"
                onClick={edit}
            ><Icon icon="pen-alt"/></button>
            <button 
                className="review"
                onClick={review}
            ><Icon icon={reviewed ? "book-open" : "book"}/></button>
            <button 
                className="delete"
                onDoubleClick={del}
                ><Icon icon="trash-alt"/>
            </button>
            <span className="rownumber">{idx+1}</span>
        </div>
    )
}
