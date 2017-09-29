import accepts from 'attr-accept'
import classNames from 'classnames'
import PropTypes from 'prop-types'
import React from 'react'


class Dropzone extends React.PureComponent {

    static PropTypes = {
        accept: PropTypes.string,
        className: PropTypes.string,
        classNameAccept: PropTypes.string,
        classNameReject: PropTypes.string,
        clickId: PropTypes.string,
        maxSize: PropTypes.number,
        multiple: PropTypes.bool,
        onClick: PropTypes.func,
        onDragAccept: PropTypes.func,
        onDragEnter: PropTypes.func,
        onDragLeave: PropTypes.func,
        onDragOver: PropTypes.func,
        onDragRejectByType: PropTypes.func,
        onDrop: PropTypes.func,
        onDropRejectBySize: PropTypes.func
    }

    static defaultProps = {
        accept: '',
        className: null,
        classNameAccept: null,
        classNameReject: null,
        clickId: 'dropzone',
        maxSize: Infinity,
        multiple: true,
        onClick: null,
        onDragAccept: null,
        onDragEnter: null,
        onDragLeave: null,
        onDragOver: null,
        onDragRejectByType: null,
        onDrop: null,
        onDropRejectBySize: null
    }

    state = {
        isDragAccepted: false,
        isDragRejected: false
    }

    dropTargets = []

    componentDidMount() {
        this.dropTargets = []
    }

    render() {
        const {
            accept,
            className,
            classNameAccept,
            classNameReject,
            clickId,
            children,
            multiple
        } = this.props

        const {isDragAccepted, isDragRejected} = this.state

        const classes = classNames(
            className,
            { [classNameAccept]: isDragAccepted },
            { [classNameReject]: isDragRejected }
        )

        return (
            <div
                className={classes}
                data-click-id={clickId}
                onClick={this.onClick}
                onDragEnter={this.onDragEnter}
                onDragOver={this.onDragOver}
                onDragLeave={this.onDragLeave}
                onDrop={this.onDrop}
                ref={this.setRef}
            >
                {children}
                <input
                    accept={accept}
                    id="file_input"
                    multiple={multiple}
                    onChange={this.onDrop}
                    ref={this.setInputRef}
                    style={{ display: 'none' }}
                    type="file"
                />
            </div>
        )
    }

    onDragEnter = (e) => {
        if (!e) {
            return
        }
        e.preventDefault()

        if (this.dropTargets.indexOf(e.target) === -1) {
            this.dropTargets.push(e.target)
        }
        const {onDragEnter, onDragAccept, onDragRejectByType} = this.props

        const files = this.getDataTransferItems(e)
        const acceptedFiles = this.getAcceptedFiles(files)
        const {rejectedFilesByType} = this.getRejectedFiles(files)
        const isDragAccepted = acceptedFiles.length === files.length
        const isDragRejected = rejectedFilesByType.length > 0

        if (onDragEnter) {
            onDragEnter.call(this, e)
        }

        if (isDragAccepted && onDragAccept) {
            onDragAccept.call(this, e)
        }

        if (isDragRejected && onDragRejectByType) {
            onDragRejectByType.call(this, e)
        }

        this.setState({
            isDragAccepted,
            isDragRejected
        })
    }

    onDragOver = (e) => {
        if (!e) {
            return
        }
        e.preventDefault()
        e.stopPropagation()

        const onDragOver = this.props.onDragOver
        if (onDragOver) {
            onDragOver.call(this, e)
        }
        return false
    }

    onDragLeave = (e) => {
        if (!e) {
            return
        }
        e.preventDefault()

        this.dropTargets = this.dropTargets.filter(
            el => el !== e.target && this.node.contains(el)
        )
        if (this.dropTargets.length > 0) {
            return
        }

        const onDragLeave = this.props.onDragLeave
        if (onDragLeave) {
            onDragLeave.call(this, e)
        }

        this.setState({
            isDragAccepted: false,
            isDragRejected: false
        })
    }

    onDrop = (e) => {
        if (!e) {
            return
        }
        e.preventDefault()

        const files = this.getDataTransferItems(e)
        const acceptedFiles = this.getAcceptedFiles(files)
        const {rejectedFilesBySize, rejectedFilesByType} = this.getRejectedFiles(files)
        const isDragRejectedBySize = rejectedFilesBySize.length > 0
        const rejectedFiles = rejectedFilesBySize.concat(rejectedFilesByType)

        const {onDrop, onDropRejectBySize} = this.props
        if (isDragRejectedBySize && onDropRejectBySize) {
            onDropRejectBySize.call(this, e)
        }
        if (onDrop) {
            onDrop.call(this, acceptedFiles, rejectedFiles, e)
        }
        this.setState({
            isDragAccepted: false,
            isDragRejected: false
        })
    }

    onClick = (e) => {
        if (!e) {
            return
        }
        e.stopPropagation()
        this.fileInputEl.value = null
        this.fileInputEl.click()

        const onClick = this.props.onClick
        if (onClick) {
            onClick.call(this, e)
        }
    }

    getDataTransferItems(e) {
        if (e.dataTransfer) {
            const dt = e.dataTransfer
            if (dt.files && dt.files.length) {
                return Array.prototype.slice.call(dt.files)
            } else if (dt.items && dt.items.length) {
                return Array.prototype.slice.call(dt.items)
            }
        } else if (e.target && e.target.files) {
            return Array.prototype.slice.call(e.target.files)
        }
        return []
    }

    getAcceptedFiles(files) {
        const acceptedFilesByType = this.getAcceptedFilesBySizeAndType(files)
        if (this.props.multiple || acceptedFilesByType.length === 0) {
            return acceptedFilesByType
        }
        return [acceptedFilesByType[0]]
    }

    getRejectedFiles(files) {
        const acceptedFilesByType = this.getAcceptedFilesBySizeAndType(files)
        const rejectedFilesBySize = this.getRejectedFilesBySize(files)
        const rejectedFilesByType = this.getRejectedFilesByType(files)
        if (this.props.multiple) {
            return {rejectedFilesBySize, rejectedFilesByType}
        }
        return {
            rejectedFilesBySize,
            rejectedFilesByType: rejectedFilesByType.concat(acceptedFilesByType.splice(1))
        }
    }

    getAcceptedFilesBySizeAndType(files) {
        return files.filter((file) => {
            return this.fileSizeAccepted(file) && this.fileTypeAccepted(file)
        })
    }

    getRejectedFilesBySize(files) {
        return files.filter(file => !this.fileSizeAccepted(file))
    }

    getRejectedFilesByType(files) {
        return files.filter(file => !this.fileTypeAccepted(file))
    }

    fileTypeAccepted = (file) => {
        return accepts(file, this.props.accept)
    }

    fileSizeAccepted = (file) => {
        if (!file || !file.size) {
            return true
        }
        return file.size <= this.props.maxSize
    }

    setRef = (ref) => {
        this.node = ref
    }

    setInputRef = (ref) => {
        this.fileInputEl = ref
    }
}

export default Dropzone
