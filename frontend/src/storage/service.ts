import { promises } from 'dns';
import localforage from 'localforage'
import * as T from '../types'

const vocabulary = localforage.createInstance({
    name: "vocabulary"
  });

export async function saveWord(key: string, word: T.Word){
    await vocabulary.setItem(key, word)
    return key
}

export async function addWord(word: T.WordInfo){
    const key = Date.now().toString()
    const newword: T.Word = {...word, reviewtime: 1, lastreview: new Date()}
    await saveWord(key, newword)
    return {key, value: newword} as T.KeyValue<T.Word>
}

export async function addWords(words: T.WordInfo[]){
    return await Promise.all(words.map(addWord))
}

export async function updateWord(key: string, f: (w:T.Word)=> T.Word){
    const newword = f(await vocabulary.getItem(key) as T.Word)
    await saveWord(key, newword)
    return newword
}

export async function reviewWord(key: string){
    const update = (w: T.Word) => {
        w.reviewtime += 1
        w.lastreview = new Date()
        return w
    }
    return await updateWord(key, update)
}

export async function updateWordField<K extends keyof T.Word, V extends T.Word[K]>(key: string, field: K, val: V){
    const update = (w: T.Word) => {
        w[field] = val
        return w
    }
    return await updateWord(key, update)
}

export async function listWords(test ?: (w: T.Word)=>boolean){
    var words: T.KeyValue<T.Word>[] = []
    const cond = test ? test : (()=>true)
    await vocabulary.iterate((value: T.Word, key)=>{
        if (cond(value)){
            words.push({key, value})
        }
    })
    return words
}


export async function delWord(key: string){
    return await vocabulary.removeItem(key)
}