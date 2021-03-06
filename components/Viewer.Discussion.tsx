// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import './Viewer.Discussion.scss'
import { observable, computed } from 'mobx'
import { observer } from 'mobx-react'
import * as React from 'react'
import { Component } from 'react'

import { Hi } from './Hi'
import { Comment } from './PipelineContext'
import { isMatch } from './RunStore'
import { MobxDropdown } from './Viewer.Comments'

import { Ago } from "azure-devops-ui/Ago"
import { Button } from 'azure-devops-ui/Button'
import { CustomCard, CardContent } from 'azure-devops-ui/Card'
import { ObservableValue } from 'azure-devops-ui/Core/Observable'
import { FormItem } from 'azure-devops-ui/FormItem'
import { Header } from 'azure-devops-ui/Header'
import { Link } from 'azure-devops-ui/Link'
import { TextField } from 'azure-devops-ui/TextField'
import { VssPersona } from 'azure-devops-ui/VssPersona'
import { IFilterState } from 'azure-devops-ui/Utilities/Filter'

const statuses = ['Open', 'Closed']

const dispositions = [
	'Should fix, P1',
	'Should fix, P2' ,
	'Should fix, P3',
	'Ignore for 90 days',
	'Not worth fixing',
	'False positive',
	'Discussion'
]

class DiscussionItem {
	public disposition = dispositions[0]
	@observable public comments = [] as Comment[]
	constructor(readonly keywords: string, public status: string, comments: Comment[]) {
		this.comments = comments
	}
}

const store = {
	discussions: [
		new DiscussionItem('RULE01', statuses[0], [
			new Comment('Michael', new Date('2010 Jan 1'), 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'),
			new Comment('Jeff'      , new Date('2010 Jan 2'), 'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.'),
			new Comment('Michael', new Date('2010 Jan 3'), 'Platea dictumst quisque sagittis purus sit amet volutpat. Urna id volutpat lacus laoreet non curabitur gravida arcu ac.'),
			new Comment('Jeff'      , new Date('2010 Jan 4'), 'Sed vulputate mi sit amet mauris commodo quis imperdiet. Sed felis eget velit aliquet sagittis id consectetur purus ut. Tincidunt tortor aliquam nulla facilisi cras fermentum odio. Turpis egestas maecenas pharetra convallis posuere morbi leo urna molestie.'),
			
		]),
		new DiscussionItem('RULE01 RULE02', statuses[1], [
			new Comment('Larry', new Date('2010 Feb 1'), 'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.')
		]),
		new DiscussionItem('RULE01 RULE02 RULE03', statuses[0], [
			new Comment('Alison', new Date('2010 Mar 1'), 'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.')
		]),
	] as DiscussionItem[]
}

const discussionHeader = (discussion: DiscussionItem) => <div className="swcDiscussionHeader flex-row flex-center">
	<span className="flex-grow"><Hi>{discussion.keywords}</Hi></span>
	<MobxDropdown items={statuses} width={200}
		selection={discussion.status}
		onSelect={item => discussion.status = item} />
	<MobxDropdown items={dispositions} width={200}
		selection={discussion.disposition}
		onSelect={item => discussion.disposition = item} />
</div>

@observer export class Discussion extends Component<{ filterState: IFilterState, user?: string }> {
	@observable selectedDiscussion = null as DiscussionItem

	@computed get filteredDiscussions() {
		const {filterState} = this.props
		const keywords = filterState.Keywords?.value.toLowerCase().split(/\s+/).filter(part => part) ?? []
		const statuses = filterState.Discussion?.value ?? []
		return store.discussions.filter(thread => {
			const isStatusMatch = !statuses.length || statuses.includes(thread.status)
			const isKeywordMatch = isMatch((thread.keywords || '').toLowerCase(), keywords)
			return isStatusMatch && isKeywordMatch
		})
	}

	@computed get hasExactKeywordMatch() {
		let keywords = this.props.filterState.Keywords?.value
		if (!keywords) return true
		keywords = keywords.toLowerCase()
		return this.filteredDiscussions.some(discussion => discussion.keywords.toLowerCase() == keywords)
	}

	render() {
		const keywords = this.props.filterState.Keywords?.value
		const discussion = this.selectedDiscussion
		const backButtonProps = discussion && { onClick: () => this.selectedDiscussion = null }
		return <div className="page-content page-content-top flex-grow flex-column">
			<CustomCard className="bolt-card-with-header flex-grow">
				<Header title="Discussion" backButtonProps={backButtonProps} />
				<CardContent className="swcDiscussionPane">
					{!discussion
						? <>
							{!this.hasExactKeywordMatch && <div style={{ marginBottom: 16 }}>
								<div style={{ marginBottom: 8 }}>{keywords}</div>
								<div><Button text="Start new discussion"
									onClick={() => {
										const newDiscussion = new DiscussionItem(keywords, statuses[0], [])
										store.discussions.push(newDiscussion)
										this.selectedDiscussion = newDiscussion
									}} /></div>
							</div>}
							{this.filteredDiscussions.map(discussion => <div
									key={discussion.keywords}
									className="swcDiscussionItem"
									onClick={e => this.selectedDiscussion = discussion}>
									{discussionHeader(discussion)}
									<div className="text-ellipsis">
										{discussion.comments?.length
											? discussion.comments[0].text
											: '(No text)'}
									</div>
								</div>)}
						</>
						: <DiscussionDetails discussion={discussion} user={this.props.user} />}
				</CardContent>
			</CustomCard>
		</div>
	}
}

@observer class DiscussionDetails extends Component<{ discussion: DiscussionItem, user?: string }> {
	@observable private showAll = false
	private newComment = new ObservableValue('')
	private newCommentError = new ObservableValue(false)
	private readonly limit = 3

	render() {
		const {discussion} = this.props
		return <>
			{discussionHeader(discussion)}
			{discussion.comments.slice(0, this.showAll ? undefined : this.limit).map((comment, i) => {
				const {who, when, text} = comment
				return <div className="swcCommentRowContent flex-row flex-start" key={i}>
					<VssPersona size="small" />
					<div className="flex-column">
						<div className="flex-row swcCommentTitle">
							<div className="primary-text text-ellipsis swcCommentPerson">{who}</div>
							<div className="secondary-text"><Ago date={when} /></div>
						</div>
						<div className="secondary-text">{text}</div>
					</div>
				</div>
			})}
			{discussion.comments.length > this.limit && !this.showAll &&
				<Link className="swcDiscussionShowAll" onClick={() => this.showAll = true}>View more comments</Link>}
			<div className="flex-row">
				<VssPersona size="small" />
				<FormItem error={this.newCommentError} className="flex-grow">
					<TextField
						ariaLabel="Write a comment..."
						placeholder="Write a comment..."
						value={this.newComment}
						onChange={(e, newValue) => {
							this.newComment.value = newValue
							this.newCommentError.value = !this.newComment.value
						}}
						onKeyPress={e => {
							if (e.key !== 'Enter') return
							e.preventDefault()
							discussion.comments.push(new Comment(this.props.user ?? 'Anonymous', new Date(), this.newComment.value))
							this.newComment.value = ''	
						}}
						multiline rows={4}
					/>
				</FormItem>
			</div>
		</>
	}
}